import React, { useState, useRef, useEffect, useCallback } from 'react';
import uitoolkit from '@zoom/videosdk-ui-toolkit';

const MessageBox = ({ message, type = 'info', onClose }) => {
  if (!message) return null;
  const bgColor = {
    info: 'bg-blue-500',
    error: 'bg-red-500',
    success: 'bg-green-500',
  }[type];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`relative ${bgColor} text-white p-6 rounded-lg shadow-xl animate-fade-in-down`}>
        <p className="text-lg font-semibold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors duration-200"
          aria-label="Close message"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center space-x-2 animate-pulse">
    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
  </div>
);

const App = () => {
  const sessionContainerRef = useRef(null);
  const [userName, setUserName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [role, setRole] = useState(0);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [pendingConfig, setPendingConfig] = useState(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const showMessage = useCallback((msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  const handleJoinLeaveSession = useCallback(async () => {
    if (typeof uitoolkit === 'undefined') {
      showMessage('Zoom Video SDK UI Toolkit is not loaded. Please check your index.html.', 'error');
      return;
    }

    if (isMeetingActive) {
      try {
        await uitoolkit.leaveSession();
        setIsMeetingActive(false);
        showMessage('You have left the meeting.', 'info');
        window.location.reload()
      } catch (error) {
        showMessage('Failed to leave the meeting.', 'error');
      }
    } else {
      if (!userName.trim() || !sessionName.trim()) {
        showMessage('Please enter your name and session ID.', 'error');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/generate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionName: sessionName,
            role: role,
            userName: userName,
          }),
        });

        const data = await response.json();
        const videoSDKJWT = data.token;

        const config = {
          videoSDKJWT,
          sessionName,
          userName,
          sessionPasscode: '',
          features: [
            'preview', 'video', 'audio', 'settings', 'users', 'chat', 'share',
            'recording', 'phone', 'invite', 'theme', 'viewMode',
            'troubleshoot', 'caption', 'header', 'footer'
          ],
          options: {
            init: {},
            audio: {},
            video: {},
            share: {},
            feedback: false
          },
          featuresOptions: {
            video: true,
            audio: true,
            chat: true,
            feedback: false,
            recording: {
              enabled: true,
              autoStart: true,
            }
          },
        };

        setPendingConfig(config);
        setIsMeetingActive(true);

      } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  }, [isMeetingActive, userName, sessionName, role, showMessage, BACKEND_URL]);

  useEffect(() => {
    if (isMeetingActive && sessionContainerRef.current && pendingConfig) {
      (async () => {
        try {
          await uitoolkit.joinSession(sessionContainerRef.current, pendingConfig);
          showMessage('Successfully joined the meeting!', 'success');
          uitoolkit.onSessionClosed(() => {
            setIsMeetingActive(false);
            window.location.reload()
            showMessage('Meeting ended by host or connection lost.', 'info');
          });
        } catch (error) {
          showMessage(`Error: ${error.message}`, 'error');
        } finally {
          setPendingConfig(null);
        }
      })();
    }
  }, [isMeetingActive, pendingConfig, showMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-emerald-200 flex flex-col lg:flex-row items-center justify-center lg:justify-evenly p-4 font-inter text-gray-800">
      <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />

      {!isMeetingActive ? (
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl w-full max-w-md transform transition-all duration-500 ease-in-out scale-100 opacity-100 hover:scale-[1.01] hover:shadow-2xl lg:w-2/5 lg:min-h-[80vh] lg:flex lg:flex-col lg:justify-center lg:items-start lg:p-16 z-10">
          <h2 className="text-4xl font-extrabold text-emerald-700 mb-6 text-center lg:text-left animate-fade-in">
            Coach Connect
          </h2>
          <p className="text-center lg:text-left text-gray-600 mb-8 animate-fade-in animation-delay-200">
            Connect with your coach or clients effortlessly.
          </p>

          <div className="space-y-6 w-full">
            <div className="relative">
              <label htmlFor="userName" className="block text-gray-700 text-sm font-semibold mb-2">Your Name</label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="E.g., Alex Johnson"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label htmlFor="sessionName" className="block text-gray-700 text-sm font-semibold mb-2">Session ID</label>
              <input
                type="text"
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="E.g., CoachingSession123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 shadow-sm"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label htmlFor="role" className="block text-gray-700 text-sm font-semibold mb-2">Role</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
                <button
                  onClick={() => setRole(1)}
                  className={`flex-1 py-3 text-lg font-medium transition-all duration-200 ${
                    role === 1
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } focus:outline-none`}
                  disabled={isLoading}
                >
                  Coach (Host)
                </button>
                <button
                  onClick={() => setRole(0)}
                  className={`flex-1 py-3 text-lg font-medium transition-all duration-200 ${
                    role === 0
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } focus:outline-none`}
                  disabled={isLoading}
                >
                  Client (Participant)
                </button>
              </div>
            </div>

            <button
              onClick={handleJoinLeaveSession}
              className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold text-xl tracking-wide hover:bg-emerald-800 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner /> : (role === 1 ? 'Start Session' : 'Join Session')}
            </button>
          </div>
        </div>
      ) : (
        <div
          id="sessionContainer"
          ref={sessionContainerRef}
          className="relative w-full h-screen bg-gray-900 rounded-lg overflow-hidden shadow-2xl animate-fade-in-up"
          style={{ width: '100vw', height: '100vh' }}
        >
          <button
            onClick={handleJoinLeaveSession}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg z-50"
          >
            Leave Session
          </button>
        </div>
      )}

      {!isMeetingActive && (
        <div className="hidden lg:flex lg:h-[80vh] items-center justify-center relative">
          <svg viewBox="0 0 500 400" className="w-full h-full max-w-lg" xmlns="http://www.w3.org/2000/svg">
            <g className="animate-float-group">
              <rect x="50" y="250" width="400" height="80" fill="#a7f3d0" rx="20" ry="20" className="animate-fade-in animation-delay-200"/>
              <ellipse cx="250" cy="250" rx="220" ry="40" fill="#dcfce7" className="animate-fade-in animation-delay-300"/>
              <g className="animate-bounce-char-1">
                <circle cx="150" cy="180" r="35" fill="#047857" className="animate-pulse-slow animation-delay-400"/>
                <rect x="130" y="210" width="40" height="60" fill="#065f46" rx="10" ry="10" className="animate-fade-in animation-delay-500"/>
                <text x="150" y="185" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold" className="animate-fade-in animation-delay-600">Coach</text>
              </g>
              <g className="animate-bounce-char-2">
                <circle cx="350" cy="180" r="30" fill="#10b981" className="animate-pulse-slow animation-delay-700"/>
                <rect x="335" y="205" width="30" height="50" fill="#0d9488" rx="8" ry="8" className="animate-fade-in animation-delay-800"/>
                <text x="350" y="185" textAnchor="middle" fill="#fff" fontSize="15" className="animate-fade-in animation-delay-900">Client</text>
              </g>
              <g className="animate-pop-in">
                <path d="M180,150 Q250,120 320,150" fill="none" stroke="#065f46" strokeWidth="5" strokeLinecap="round" className="stroke-animation-wave" />
                <circle cx="250" cy="130" r="15" fill="#ecfdf5" className="animate-fade-in animation-delay-1000"/>
                <path d="M245,130 L255,130 M250,125 L250,135" stroke="#047857" strokeWidth="2" strokeLinecap="round" className="animate-fade-in animation-delay-1100"/>
              </g>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
};

export default App;
