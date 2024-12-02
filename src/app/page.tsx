'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Plus, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  avatar?: string;
}

interface DifyResponse {
  event: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  created_at?: number;
  code?: string;
  status?: number;
  message?: string;
}

interface AppMessage extends Message {
  conversation_id?: string;
}

interface App {
  name: string;
  apiKey: string;
  messages?: AppMessage[];
  conversation_id?: string;
}

export default function Home() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [newAppName, setNewAppName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const handleAddApp = () => {
    if (newAppName && newApiKey) {
      setApps([...apps, { 
        name: newAppName, 
        apiKey: newApiKey,
        messages: [
          {
            id: '1',
            content: 'Hello! How can I help you today?',
            sender: 'Assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]
      }]);
      setNewApiKey('');
      setNewAppName('');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedApp) return;

    const userMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'User',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedApps = apps.map(app => {
      if (app.name === selectedApp.name) {
        const updatedApp = {
          ...app,
          messages: [...(app.messages || []), userMessage]
        };
        setSelectedApp(updatedApp);
        return updatedApp;
      }
      return app;
    });

    setApps(updatedApps);
    setNewMessage('');
    
    try {
      const response = await fetch('https://api.dify.ai/v1/chat-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${selectedApp.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query: newMessage,
          response_mode: 'streaming',
          conversation_id: selectedApp.conversation_id || '',
          user: 'user-123',
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = {
        id: Date.now().toString(),
        content: '',
        sender: 'Assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        conversation_id: '',
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          console.log(line);
          if (line.startsWith('data: ')) {
            const data: DifyResponse = JSON.parse(line.slice(6));
            
            if (data.event === 'error') {
              const errorMessage = {
                id: Date.now().toString(),
                content: `Error: ${data.message || 'An error occurred'}`,
                sender: 'Assistant',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                conversation_id: data.conversation_id,
              };

              setApps(prevApps => {
                const newApps = prevApps.map(app => {
                  if (app.name === selectedApp.name) {
                    const updatedApp = {
                      ...app,
                      messages: [...(app.messages || []), errorMessage],
                      conversation_id: data.conversation_id,
                    };
                    setSelectedApp(updatedApp);
                    return updatedApp;
                  }
                  return app;
                });
                return newApps;
              });
              
              reader.cancel();
              break;
            } else if (data.event === 'message') {
              assistantMessage.content += data.answer || '';
              assistantMessage.conversation_id = data.conversation_id;

              setApps(prevApps => {
                const newApps = prevApps.map(app => {
                  if (app.name === selectedApp.name) {
                    const messages = [...(app.messages || [])];
                    const lastMessage = messages[messages.length - 1];
                    
                    if (lastMessage.sender === 'Assistant') {
                      messages[messages.length - 1] = assistantMessage;
                    } else {
                      messages.push(assistantMessage);
                    }

                    const updatedApp = {
                      ...app,
                      messages,
                      conversation_id: data.conversation_id,
                    };
                    setSelectedApp(updatedApp);
                    return updatedApp;
                  }
                  return app;
                });
                return newApps;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Apps Management */}
      <div className="w-80 border-r">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Apps</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border shadow-lg">
                <DialogHeader className="border-b px-6 py-4">
                  <DialogTitle className="flex items-center justify-between">
                    <span className="text-xl font-semibold">Add New App</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="px-6 py-6 space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      App Name
                    </label>
                    <Input
                      id="name"
                      placeholder="Enter app name"
                      className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="apiKey" className="text-sm font-medium">
                      API Key
                    </label>
                    <Input
                      id="apiKey"
                      placeholder="Dify API Key"
                      className="h-9"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your Dify API key to connect your app
                    </p>
                  </div>
                </div>
                <DialogClose asChild>
                  <Button 
                    className="w-full"
                    onClick={handleAddApp}
                    disabled={!newAppName || !newApiKey}
                  >
                    Add App
                  </Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="space-y-1 pr-4">
              {apps.map((app, index) => (
                <div
                  key={index}
                  className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedApp?.name === app.name ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div>
                    <div className="font-medium">{app.name}</div>
                    <div className="text-sm text-muted-foreground">
                      API Key: {app.apiKey.slice(0, 2)}•••••{app.apiKey.slice(-2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Panel - Chat UI */}
      <div className="flex-1 h-full overflow-hidden flex flex-col bg-background">
        {selectedApp ? (
          <>
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Chat with {selectedApp.name}</h2>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {selectedApp.messages?.map((message, index) => (
                  <div key={message.id} className="space-y-4">
                    {index === 0 && (
                      <div className="text-center">
                        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>
                          {message.sender === 'Assistant' ? selectedApp.name[0] : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.sender}</span>
                          <span className="text-sm text-muted-foreground">{message.timestamp}</span>
                        </div>
                        <p className="mt-1 text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Plus className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an app to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
