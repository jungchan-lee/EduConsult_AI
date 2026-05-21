'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { ChatMessageComponent } from '@/components/recommendation/ChatMessage';
import { TeacherMatchCard } from '@/components/recommendation/TeacherMatchCard';
import { ChatMessage, MatchingSession } from '@/types/recommendation';

export default function MatchingPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<MatchingSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/recommendations?sessionId=${sessionId}`);

        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const data: MatchingSession = await response.json();
        setSession(data);
        setMessages(data.messages);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackInput.trim() || !sessionId) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: feedbackInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setFeedbackInput('');
    setIsLoading(true);

    try {
      // Send feedback to AI for re-ranking
      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          feedback: feedbackInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process feedback');
      }

      const result = await response.json();

      // Add AI response message
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: result.analysisText,
        timestamp: new Date(),
        metadata: {
          recommendations: result.topMatches,
        },
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update session with new recommendations
      if (session) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentRecommendation: result,
                messages: [...prev.messages, userMessage, aiMessage],
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error processing feedback:', error);
      alert('Failed to process feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !session) {
    return (
      <main className="min-h-screen pt-6 px-8">
        <Header title="AI Matching" subtitle="Loading recommendations..." />
        <div className="p-8 flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Generating personalized recommendations...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-6 px-8">
      <Header
        title="AI Matching"
        subtitle={session ? `Recommendations for ${session.studentName}` : 'Matching in progress'}
        breadcrumbs={[
          { label: 'Main Dashboard', href: '/' },
          { label: 'AI Matching' },
        ]}
      />

      <div className="p-8 bg-gray-50 rounded-3xl min-h-[calc(100vh-6rem)] flex flex-col">
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {session && messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-5xl mb-4">🤖</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Initial Analysis Complete</h3>
                      <p className="text-gray-600 mb-4">
                        Based on {session.studentName}'s profile and your strategic direction, here are the best teacher matches.
                      </p>
                      <p className="text-sm text-gray-500">
                        Provide feedback below to refine recommendations.
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} />
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Top Matches Section */}
              {session?.currentRecommendation && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Recommended Teachers</h3>
                  <div className="space-y-4">
                    {session.currentRecommendation.topMatches.map((teacher, idx) => (
                      <TeacherMatchCard
                        key={teacher.id}
                        teacher={teacher}
                        rank={idx === 0 ? 'primary' : idx === 1 ? 'secondary' : 'tertiary'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-gray-200 p-6 bg-white">
                <form onSubmit={handleSendFeedback} className="flex gap-3">
                  <input
                    type="text"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Provide feedback or request adjustments (e.g., 'Focus on care skills', 'Avoid pressure-based style')..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    disabled={!feedbackInput.trim() || isLoading}
                  >
                    Send
                  </Button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Be specific about preferences to get better matches (e.g., "student prefers analytical approach")
                </p>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="w-80">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Session Info</h3>

                {session && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Student</p>
                      <p className="text-sm font-medium text-gray-900">{session.studentName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Target</p>
                      <p className="text-sm font-medium text-gray-900">
                        {session.targetUniversity} • {session.targetDepartment}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Director's Strategic Direction</p>
                      <p className="text-sm text-gray-700 italic">{session.directorInstruction}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-2">Quick Actions</p>
                      <Button variant="outline" size="sm" className="w-full mb-2">
                        ✓ Approve Match
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        📋 View Full Report
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}
