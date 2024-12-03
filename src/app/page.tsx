"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreVertical,
  Plus,
  Send,
  MessageSquare,
  Key,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { MessageDisplay } from "@/components/MessageDisplay";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

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
  type: string;
  messages?: AppMessage[];
  conversation_id?: string;
}

const steps = [
  {
    icon: MessageSquare,
    title: "Create a Chatbot",
    description: "Visit cloud.dify.ai to create your chatbot application",
    link: "https://cloud.dify.ai",
  },
  {
    icon: Key,
    title: "Enable API Access",
    description: "Go to your app configuration and create an API key",
  },
  {
    icon: Plus,
    title: "Add Your App",
    description: "Click the + button on the left panel to add your app",
  },
];

export default function Home() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [newAppName, setNewAppName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newAppType, setNewAppType] = useState("chatbot");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const savedApps = localStorage.getItem("difyApps");
    if (savedApps) {
      setApps(JSON.parse(savedApps));
    }
  }, []);

  useEffect(() => {
    if (apps.length > 0) {
      localStorage.setItem("difyApps", JSON.stringify(apps));
    }
  }, [apps]);

  const handleAddApp = () => {
    if (newAppName && newApiKey) {
      const newApps = [
        ...apps,
        {
          name: newAppName,
          apiKey: newApiKey,
          type: newAppType,
          messages: [
            {
              id: "1",
              content: "Hello! How can I help you today?",
              sender: "Assistant",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ],
        },
      ];
      setApps(newApps);
      localStorage.setItem("difyApps", JSON.stringify(newApps));
      setNewApiKey("");
      setNewAppName("");
      setNewAppType("chatbot");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedApp) return;

    const userMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "User",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedApps = apps.map((app) => {
      if (app.name === selectedApp.name) {
        const updatedApp = {
          ...app,
          messages: [...(app.messages || []), userMessage],
        };
        setSelectedApp(updatedApp);
        return updatedApp;
      }
      return app;
    });

    setApps(updatedApps);
    setNewMessage("");

    try {
      const endpoint = selectedApp.type === 'workflow' 
        ? 'https://api.dify.ai/v1/workflows/run'
        : 'https://api.dify.ai/v1/chat-messages';

      const payload = selectedApp.type === 'workflow' 
        ? {
            inputs: { url: newMessage },
            response_mode: "blocking",
            user: "user-123",
          }
        : {
            inputs: {},
            query: newMessage,
            response_mode: "streaming",
            conversation_id: selectedApp.conversation_id || "",
            user: "user-123",
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${selectedApp.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (selectedApp.type === 'workflow') {
        const data = await response.json();
        const assistantMessage = {
          id: Date.now().toString(),
          content: data.data.outputs.keywords || "No response",
          sender: "Assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setApps((prevApps) => {
          const newApps = prevApps.map((app) => {
            if (app.name === selectedApp.name) {
              const updatedApp = {
                ...app,
                messages: [...(app.messages || []), assistantMessage],
              };
              setSelectedApp(updatedApp);
              return updatedApp;
            }
            return app;
          });
          return newApps;
        });
      } else {
        const reader = response.body?.getReader();
        if (!reader) return;

        const assistantMessage = {
          id: Date.now().toString(),
          content: "",
          sender: "Assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          conversation_id: "",
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            console.log(line);
            if (line.startsWith("data: ")) {
              const data: DifyResponse = JSON.parse(line.slice(6));

              if (data.event === "error") {
                const errorMessage = {
                  id: Date.now().toString(),
                  content: `Error: ${data.message || "An error occurred"}`,
                  sender: "Assistant",
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  conversation_id: data.conversation_id,
                };

                setApps((prevApps) => {
                  const newApps = prevApps.map((app) => {
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
              } else if (data.event === "message") {
                assistantMessage.content += data.answer || "";
                assistantMessage.conversation_id = data.conversation_id || "";

                setApps((prevApps) => {
                  const newApps = prevApps.map((app) => {
                    if (app.name === selectedApp.name) {
                      const messages = [...(app.messages || [])];
                      const lastMessage = messages[messages.length - 1];

                      if (lastMessage.sender === "Assistant") {
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
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const GuideContent = () => {
    const [activeStep, setActiveStep] = useState(0)
  
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-12 tracking-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Welcome to ChatDify
          </motion.h1>
          
          <div className="grid md:grid-cols-[1fr,2fr] gap-8">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.button
                  key={step.title}
                  className={`w-full text-left p-4 rounded-lg transition-colors duration-300 ${
                    index === activeStep ? 'bg-white text-black' : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                  onClick={() => setActiveStep(index)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{step.title}</span>
                    <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${
                      index === activeStep ? 'rotate-90' : ''
                    }`} />
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="relative h-[300px] bg-zinc-900 rounded-lg p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-zinc-800">
                      {steps[activeStep].icon && React.createElement(steps[activeStep].icon, { className: "w-6 h-6" })}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold mb-4">{steps[activeStep].title}</h2>
                      <p className="text-zinc-400 mb-4">{steps[activeStep].description}</p>
                      {steps[activeStep].link && (
                        <a
                          href={steps[activeStep].link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-white hover:underline"
                        >
                          Learn more
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <p className="text-xl text-zinc-400">
              Once you've added your app, select it to start chatting!
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Apps Management */}
      <div className="w-80 border-r flex flex-col h-full">
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dify Apps</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900">
                <DialogHeader className="space-y-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-semibold">
                        Add New App
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Add attributes and manage access
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        App Name
                      </label>
                      <Input
                        id="name"
                        placeholder="Enter app name"
                        className="h-10"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        autoComplete="off"
                        data-form-type="other"
                        autoCapitalize="off"
                        autoCorrect="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        This is a local name to help you identify your Dify app.
                        It can be different from your Dify app name
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="apiKey" className="text-sm font-medium">
                        API Key
                      </label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          placeholder="Dify API Key"
                          className="h-10 pr-10"
                          value={newApiKey}
                          onChange={(e) => setNewApiKey(e.target.value)}
                          autoComplete="off"
                          data-form-type="other"
                          autoCapitalize="off"
                          autoCorrect="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-10 w-10"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter your Dify API key to connect your app
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="type" className="text-sm font-medium">
                        App Type
                      </label>
                      <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                        value={newAppType}
                        onChange={(e) => setNewAppType(e.target.value)}
                      >
                        <option value="chatbot">Chatbot</option>
                        <option value="workflow">Workflow</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Choose between a Chatbot or Workflow application type
                      </p>
                    </div>
                  </div>
                </form>

                <div className="flex justify-end gap-3 mt-6">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      onClick={handleAddApp}
                      disabled={!newAppName || !newApiKey}
                    >
                      Save changes
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1 pr-4">
              {apps.map((app, index) => (
                <div
                  key={index}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedApp?.name === app.name ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex-1" onClick={() => setSelectedApp(app)}>
                    <div className="font-medium">{app.name}</div>
                    <div className="text-sm text-muted-foreground">
                      API Key: {app.apiKey.slice(0, 2)}•••••
                      {app.apiKey.slice(-2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmed = window.confirm(
                        `Are you sure you want to delete ${app.name}?`
                      );
                      if (confirmed) {
                        const newApps = apps.filter((a) => a.name !== app.name);
                        setApps(newApps);
                        if (selectedApp?.name === app.name) {
                          setSelectedApp(null);
                        }
                        localStorage.setItem(
                          "difyApps",
                          JSON.stringify(newApps)
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
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
              <h2 className="text-xl font-semibold">
                Chat with {selectedApp.name}
              </h2>
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
                          {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>
                          {message.sender === "Assistant"
                            ? selectedApp.name[0]
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.sender}</span>
                          <span className="text-sm text-muted-foreground">
                            {message.timestamp}
                          </span>
                        </div>
                        <MessageDisplay content={message.content} />
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
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                  autoComplete="new-password"
                  spellCheck="false"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <GuideContent />
        )}
      </div>
    </div>
  );
}
