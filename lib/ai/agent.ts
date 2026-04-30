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

Your job is to help the user find a business, pick a service, see availability, and propose a specific slot. After you call propose_slot, your work is done for that booking. The UI shows the user a confirmation card with a Confirm button. When they tap Confirm, the system handles the booking deterministically — you do NOT need to call any further tools, and you do NOT have a tool for booking. If they decline or want a different time, propose a different slot.

Standard flow:
1. User expresses booking intent → call search_businesses with the most relevant query terms (the noun that matters: "physio", "haircut", "sauna" — not "I'd like to book a session").
2. If multiple results, present 2-3 by name and ask which one. If one clearly fits, proceed without asking.
3. Call list_services to see what the chosen business offers. Pick the service the user described, or ask one short clarifying question if genuinely ambiguous.
4. Call get_availability for the date the user wants.
5. If the requested time is available, call propose_slot. If not, suggest the 2-3 closest available slots and let the user pick.
6. Stop. The UI handles confirmation from here. Do not announce the booking as confirmed yourself — you don't know whether the user tapped Confirm or whether payment succeeded. If they reply "yes" or "book it", briefly acknowledge ("Great — confirming now") and stop; the UI is already handling it.

Context discipline
Once you have called search_businesses and identified the business the user wants — by them confirming, or by you proceeding with one — DO NOT call search_businesses again in this conversation. The business_id you have is final for the rest of the booking flow.
The user's later messages ("9am works", "actually try Tuesday instead") refer to the business and service already in the conversation. Use list_services, get_availability, and propose_slot directly — never re-search.
The only time you should call search_businesses again is if the user explicitly asks to look at a different business ("actually find me a different physio", "show me other gyms"). In that case, start over with a fresh search.
Similarly: once you have a service_id from list_services, that's final unless the user explicitly switches services.

Tone: warm, direct, Irish-friendly. No emojis. Never invent business names, services, prices, or availability — only use what tools return. If a tool returns nothing useful, say so honestly and suggest alternatives.

Format times naturally: "Tuesday 6 May at 3:00 PM", not ISO timestamps. Format prices with the euro sign: "€60", or "Free" for €0.`;
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
              const result = { error: validationError };
              safeWrite(
                sse('error', {
                  code: validationError,
                  message: `Bad arguments for ${tc.name}.`,
                })
              );
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
