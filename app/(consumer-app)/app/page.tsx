'use client'

import { useState } from 'react'
import HomeScreen from '@/components/app/HomeScreen'
import AssistantScreen from '@/components/app/AssistantScreen'
import ChatScreen from '@/components/app/ChatScreen'
import ConfirmScreen from '@/components/app/ConfirmScreen'
import SuccessScreen from '@/components/app/SuccessScreen'

export type Screen = 'home' | 'assistant' | 'chat' | 'confirm' | 'success'

export default function AppPage() {
  const [screen, setScreen] = useState<Screen>('home')
  const [chatType, setChatType] = useState<string>('nail')
  const [screenHistory, setScreenHistory] = useState<Screen[]>([])

  const navigate = (next: Screen, type?: string) => {
    setScreenHistory((prev) => [...prev, screen])
    if (type) setChatType(type)
    setScreen(next)
  }

  const goBack = () => {
    const prev = screenHistory[screenHistory.length - 1] || 'home'
    setScreenHistory((h) => h.slice(0, -1))
    setScreen(prev)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#080808' }}>
      {screen === 'home' && <HomeScreen navigate={navigate} />}
      {screen === 'assistant' && <AssistantScreen navigate={navigate} />}
      {screen === 'chat' && <ChatScreen navigate={navigate} goBack={goBack} chatType={chatType} />}
      {screen === 'confirm' && <ConfirmScreen navigate={navigate} goBack={goBack} />}
      {screen === 'success' && <SuccessScreen navigate={navigate} />}
    </div>
  )
}
