import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HomeScreen from './screens/HomeScreen';
import AssistantScreen from './screens/AssistantScreen';
import ChatScreen from './screens/ChatScreen';
import ConfirmScreen from './screens/ConfirmScreen';
import SuccessScreen from './screens/SuccessScreen';

export default function App() {
  const location = useLocation();

  return (
    <div
      style={{
        maxWidth: 430,
        margin: '0 auto',
        height: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        background: '#080808',
      }}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/assistant" element={<AssistantScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/confirm" element={<ConfirmScreen />} />
          <Route path="/success" element={<SuccessScreen />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
