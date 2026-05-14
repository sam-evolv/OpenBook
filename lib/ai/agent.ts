/**
 * Streaming agent loop for the consumer AI booking assistant.
 * Wraps an OpenAI chat completion with tool calling, dispatches
 * tools server-side, and writes Server-Sent Events to a
 * ReadableStream consumed by app/api/ai/chat/route.ts.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TOOL_DEFS,
  dispatchTool,
  validateArgs,
  type ToolName,
} from './tools';

const MODEL = 'gpt-4o';
const MAX_TOOL_CALLS_PER_TURN = 10;
const MAX_OUTPUT_TOKENS = 800;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Validation failures that are recoverable on the next turn — the model
 * has all the info it needs to self-correct (e.g. it wrote a placeholder
 * string instead of a UUID it already saw). The agent loop suppresses
 * the SSE 'error' event for these and feeds a hint back to the model
 * via the tool result instead, so the user never sees a red error
 * bubble for what is actually a recoverable in-loop hiccup.
 */
const SILENT_VALIDATION_CODES = new Set<string>([
  'invalid_business_id',
  'invalid_service_id',
  'invalid_booking_id',
  'invalid_slot_start',
]);

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

function dublinDateISO(): string {
  // YYYY-MM-DD in Europe/Dublin.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(
    new Date()
  );
}

function buildSystemPrompt(): string {
  return `You are OpenBook's booking assistant. You help people in Ireland book appointments at local service businesses — gyms, salons, spas, barbers, physios, yoga studios. Your job is to take a user from intent to a confirmed booking in as few turns as possible.

You have tools. Use them. Never tell the user you cannot check availability or that they should contact a business directly — those are failure modes, not valid responses. If you need information, call a tool.

Today is ${dublinDateISO()} in Europe/Dublin. Resolve relative dates ("tomorrow", "this Friday", "next Tuesday") to YYYY-MM-DD before calling get_availability.

## Timezone — read this carefully

The OpenBook business is in Ireland. ALL user-stated times are in **Irish local time** (Europe/Dublin), which observes BST (UTC+1) from late March to late October and GMT (UTC+0) the rest of the year.

When a user says "9 AM" or "9:45 a.m.", they mean **Irish local time**, not UTC.

When you call get_availability or propose_slot:
- The slot_start values returned by get_availability are already correct timestamps with timezone offsets — pass them through unchanged when calling propose_slot.
- NEVER construct a new ISO string yourself by appending "+00:00" or "Z" to a user-stated time. That would treat the user's local time as UTC and book them an hour wrong during BST.
- To pick a specific time the user requested, find the matching slot in the get_availability result and pass that exact slot_start value.

Example:
User says "9:45 AM tomorrow". get_availability returns slots including \`{"slot_start": "2026-05-01T08:45:00+00:00", "slot_end": "..."}\`. Note 08:45 UTC = 09:45 BST. Pass \`slot_start: "2026-05-01T08:45:00+00:00"\` to propose_slot. Do NOT construct \`2026-05-01T09:45:00+00:00\`.

Your job is to help the user find a business, pick a service, see availability, and propose a specific slot. After you call propose_slot, your work is done for that booking. The UI shows the user a confirmation card with a Confirm button. When they tap Confirm, the system handles the booking deterministically — you do NOT need to call any further tools, and you do NOT have a tool for booking. If they decline or want a different time, propose a different slot.

## Default to the primary service — do not ask permission

When a user requests a specific time and business ("Dublin Iron Gym at 7:30pm tomorrow", "book me at Refresh Barber for Friday morning"), immediately check availability for the business's **primary service** and propose that slot. Do NOT ask the user to choose a service unless they specifically ask about services or prices, or the primary service has no availability at the requested time.

The primary service is the one returned **first** in the search_businesses \`services\` array (services are pre-sorted by sort_order ascending — index 0 is the business's headline offering). search_businesses already returns every active service inline, so you usually do NOT need to call list_services at all.

Examples:
- "Dublin Iron Gym at 7:30pm tomorrow" → search_businesses with business_name "Dublin Iron Gym" → take services[0] → get_availability for tomorrow → propose_slot for the 7:30pm match. No service question.
- "Book me at Refresh Barber Friday at 10" → search_businesses with business_name "Refresh Barber" → services[0] → get_availability Friday → propose_slot 10:00. No service question.
- "What services does Iron Gym offer?" → user explicitly asked about services, so list them. Then proceed.
- "Book me at Iron Gym, the Strength Assessment, 7:30pm" → user named the service explicitly, so use that one.
- Primary service has nothing at the requested time → fall back: surface the closest available alternatives for that primary service first, only mention other services if no alternatives exist.

Standard flow:
1. User expresses booking intent → call search_businesses with the most relevant query terms (the noun that matters: "physio", "haircut", "sauna" — not "I'd like to book a session"). When the user names a specific business, pass it as \`business_name\`.
2. If multiple results, present 2-3 by name and ask which one. If one clearly fits, proceed without asking.
3. Pick the primary service from \`services[0]\` and proceed. Only call list_services or ask the user if the search didn't return services or the user explicitly asked about service options.
4. Call get_availability for the date the user wants.
5. If the requested time is available, call propose_slot. If not, suggest the 2-3 closest available slots for the same service and let the user pick.
6. Stop. The UI handles confirmation from here. Do not announce the booking as confirmed yourself — you don't know whether the user tapped Confirm or whether payment succeeded. If they reply "yes" or "book it", briefly acknowledge ("Great — confirming now") and stop; the UI is already handling it.

Context discipline
Once you have called search_businesses and identified the business the user wants — by them confirming, or by you proceeding with one — DO NOT call search_businesses again in this conversation. The business_id you have is final for the rest of the booking flow.
The user's later messages ("9am works", "actually try Tuesday instead") refer to the business and service already in the conversation. Use get_availability and propose_slot directly — never re-search, and never re-prompt for the service unless the user asks to change it.
The only time you should call search_businesses again is if the user explicitly asks to look at a different business ("actually find me a different physio", "show me other gyms"). In that case, start over with a fresh search.
Similarly: once you have a service_id, that's final unless the user explicitly switches services.

Tone: warm, direct, Irish-friendly. No emojis. Never invent business names, services, prices, or availability — only use what tools return. If a tool returns nothing useful, say so honestly and suggest alternatives.

Format times naturally: "Tuesday 6 May at 3:00 PM", not ISO timestamps. Format prices with the euro sign: "€60", or "Free" for €0.

## Cards in prose

When a tool result returns a list of items rendered as cards (search_businesses → business chips, get_availability → slot picker), your prose response MUST mention every returned item, in the same order they appear as cards. Never describe only a subset and leave other returned cards unexplained — the user sees both at once and the mismatch reads as a bug. If you can't usefully say something about each card, say so explicitly ("Here are the four closest matches; I don't know much about the last two beyond what's on each card.").`;
}

function clampHistory(
  messages: ChatCompletionMessageParam[]
): ChatCompletionMessageParam[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_HISTORY_MESSAGES);
}

// ---------------------------------------------------------------------------
// SSE encoding
// ---------------------------------------------------------------------------

const enc = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export interface AgentContext {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  customerId: string | null;
  origin: string;
  cookieHeader: string;
  conversationId: string | null;
}

export function runAgentSSE(
  inboundMessages: ChatCompletionMessageParam[],
  ctx: AgentContext
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeWrite = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch {
          /* client disconnected */
        }
      };
      const closeWith = (reason?: { code: string; message: string }) => {
        if (reason) safeWrite(sse('error', reason));
        safeWrite(sse('done', {}));
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        const openai = getOpenAI();

        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: buildSystemPrompt() },
          ...clampHistory(inboundMessages),
        ];

        let toolCallBudget = MAX_TOOL_CALLS_PER_TURN;

        for (let iter = 0; iter < MAX_TOOL_CALLS_PER_TURN + 1; iter++) {
          const stream = await openai.chat.completions.create({
            model: MODEL,
            messages,
            tools: TOOL_DEFS,
            parallel_tool_calls: false,
            tool_choice: 'auto',
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
          });

          // Accumulate the streamed assistant message — text deltas
          // emit immediately, tool_calls are reconstructed at the end.
          let textBuffer = '';
          const toolCallAcc: Record<
            number,
            {
              id: string;
              name: string;
              argsText: string;
            }
          > = {};
          let finishReason: string | null = null;

          for await (const chunk of stream) {
            const choice = chunk.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta as any;
            if (typeof delta?.content === 'string' && delta.content.length > 0) {
              textBuffer += delta.content;
              safeWrite(sse('text', { delta: delta.content }));
            }
            if (Array.isArray(delta?.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallAcc[idx]) {
                  toolCallAcc[idx] = { id: '', name: '', argsText: '' };
                }
                if (tc.id) toolCallAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallAcc[idx].name = tc.function.name;
                if (typeof tc.function?.arguments === 'string') {
                  toolCallAcc[idx].argsText += tc.function.arguments;
                }
              }
            }
            if (choice.finish_reason) finishReason = choice.finish_reason;
          }

          const toolCalls = Object.values(toolCallAcc);

          if (toolCalls.length === 0) {
            // No tool calls — final assistant message. Done.
            messages.push({ role: 'assistant', content: textBuffer });
            break;
          }

          // Append the assistant message with tool_calls (required by the API
          // before posting tool role results).
          const assistantToolMsg: ChatCompletionMessageParam = {
            role: 'assistant',
            content: textBuffer.length > 0 ? textBuffer : null,
            tool_calls: toolCalls.map((t) => ({
              id: t.id || `call_${Date.now()}_${Math.random()}`,
              type: 'function',
              function: { name: t.name, arguments: t.argsText || '{}' },
            })) as ChatCompletionMessageToolCall[],
          };
          messages.push(assistantToolMsg);

          // Execute each tool call.
          for (const tc of toolCalls) {
            if (toolCallBudget <= 0) {
              safeWrite(
                sse('error', {
                  code: 'tool_budget_exceeded',
                  message:
                    'Too many tool calls in one turn. Stopping for safety.',
                })
              );
              messages.push({
                role: 'tool',
                tool_call_id: tc.id || 'budget',
                content: JSON.stringify({ error: 'tool_budget_exceeded' }),
              });
              continue;
            }
            toolCallBudget--;

            let parsedArgs: any = {};
            try {
              parsedArgs = tc.argsText ? JSON.parse(tc.argsText) : {};
            } catch {
              parsedArgs = {};
            }

            safeWrite(
              sse('tool_call_start', { tool_name: tc.name, args: parsedArgs })
            );

            const validationError = validateArgs(tc.name as ToolName, parsedArgs);
            if (validationError) {
              // UUID-shape failures are almost always the model writing
              // a placeholder string ("free-consultation-service-id")
              // instead of the real UUID it already saw in a prior tool
              // result. The model self-corrects on retry. Don't show the
              // user the red error in chat — feed a corrective hint back
              // to the model and let the next iteration succeed silently.
              const isSilent = SILENT_VALIDATION_CODES.has(validationError);
              const result = isSilent
                ? {
                    error: 'invalid_uuid_format',
                    hint: 'business_id and service_id must be the exact UUID values returned by search_businesses and list_services in this conversation. Do not invent placeholder strings — use the IDs from prior tool results verbatim.',
                  }
                : { error: validationError };
              if (!isSilent) {
                safeWrite(
                  sse('error', {
                    code: validationError,
                    message: `Bad arguments for ${tc.name}.`,
                  })
                );
              }
              messages.push({
                role: 'tool',
                tool_call_id: tc.id || 'invalid',
                content: JSON.stringify(result),
              });
              fireAndForgetLog(ctx, tc.name, parsedArgs, result, 0);
              continue;
            }

            const t0 = Date.now();
            let modelResult: any;
            try {
              const dispatched = await dispatchTool(
                tc.name as ToolName,
                parsedArgs,
                ctx
              );
              modelResult = dispatched.modelResult;
              for (const ev of dispatched.events) {
                safeWrite(sse(ev.type, ev.data));
              }
            } catch (e: any) {
              modelResult = { error: e?.message ?? 'tool_failed' };
              safeWrite(
                sse('error', {
                  code: 'tool_failed',
                  message: 'A tool call failed. Trying to recover.',
                })
              );
            }
            const latency = Date.now() - t0;

            // Surface read-tool results to the UI for card rendering.
            if (
              tc.name === 'search_businesses' ||
              tc.name === 'list_services' ||
              tc.name === 'get_availability'
            ) {
              safeWrite(
                sse('tool_call_result', {
                  tool_name: tc.name,
                  result: modelResult,
                })
              );
            }

            messages.push({
              role: 'tool',
              tool_call_id: tc.id || 'tool',
              content: JSON.stringify(modelResult),
            });

            fireAndForgetLog(ctx, tc.name, parsedArgs, modelResult, latency);
          }

          if (finishReason === 'stop') break;
        }

        closeWith();
      } catch (err: any) {
        console.error('[ai/chat] agent error:', err);
        closeWith({
          code: 'ai_unavailable',
          message:
            'Sorry — the assistant is unavailable right now. Please try again in a moment.',
        });
      }
    },
  });
}

function fireAndForgetLog(
  ctx: AgentContext,
  toolName: string,
  args: any,
  result: any,
  latencyMs: number
) {
  const trimmed = (() => {
    try {
      const s = JSON.stringify(result);
      if (s.length > 8000) return { _truncated: true, len: s.length };
      return result;
    } catch {
      return { _unserializable: true };
    }
  })();
  ctx.adminClient
    .from('ai_tool_calls')
    .insert({
      customer_id: ctx.customerId,
      conversation_id: ctx.conversationId,
      tool_name: toolName,
      args,
      result: trimmed,
      latency_ms: latencyMs,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error('[ai/chat] log insert failed:', error.message);
    });
}
