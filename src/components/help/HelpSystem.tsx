'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  HelpCircle, 
  MessageCircle, 
  Search, 
  BookOpen, 
  Play, 
  ExternalLink,
  X,
  Bot,
  Send,
  Info,
  CheckCircle,
  Circle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedCallback } from 'use-debounce'

// Types
interface HelpContent {
  id: string
  title: string
  content: string
  excerpt: string
  type: 'article' | 'video' | 'tutorial' | 'faq'
  category: string
  userRoles: string[]
  url: string
}

interface TourStep {
  target: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  title?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  suggestions?: string[]
  resources?: Array<{ title: string; url: string }>
}

// Help Tooltip Component
export const HelpTooltip: React.FC<{
  content: string
  helpLink?: string
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}> = ({ content, helpLink, children, placement = 'top' }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={placement} className="max-w-xs p-3">
          <p className="text-sm">{content}</p>
          {helpLink && (
            <a 
              href={helpLink}
              className="text-blue-600 text-xs mt-2 block hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more →
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Smart Help Search Component
const SmartHelpSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HelpContent[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const searchHelp = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/help/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          userRole: user?.role,
          currentPage: router.pathname,
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Help search error:', error)
    } finally {
      setLoading(false)
    }
  }, 300)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search help articles, guides, and tutorials..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            searchHelp(e.target.value)
          }}
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((result) => (
            <div key={result.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{result.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.excerpt}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                    <span className="text-xs text-gray-500">{result.type}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => window.open(result.url, '_blank')}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2">Suggested Topics</h5>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Help Assistant Chat Component
const HelpAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const response = await fetch('/api/help/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: {
            userRole: user?.role,
            currentPage: router.pathname,
            previousMessages: messages.slice(-5)
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          suggestions: data.suggestions,
          resources: data.resources,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Help assistant error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try contacting support directly.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [messages, user?.role, router.pathname])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 shadow-lg"
        variant={isOpen ? "secondary" : "default"}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border rounded-lg shadow-xl flex flex-col">
          <div className="p-4 border-b bg-blue-50 rounded-t-lg">
            <h3 className="font-medium">Help Assistant</h3>
            <p className="text-sm text-gray-600">Ask me anything about the platform</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2" />
                <p>Hi! I'm here to help you navigate the platform.</p>
                <p>What would you like to know?</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>

                  {message.role === 'assistant' && message.suggestions && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-1 text-blue-600 hover:bg-blue-50"
                          onClick={() => sendMessage(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}

                  {message.role === 'assistant' && message.resources && (
                    <div className="mt-2 space-y-1">
                      {message.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:underline"
                        >
                          📖 {resource.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isTyping}
                className="flex-1 text-sm"
              />
              <Button type="submit" disabled={!input.trim() || isTyping} size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// Quick Guides Component
const QuickGuides: React.FC = () => {
  const guides = [
    { title: 'Getting Started', icon: Play, url: '/help/getting-started' },
    { title: 'Booking Classes', icon: BookOpen, url: '/help/booking' },
    { title: 'Managing Hours', icon: HelpCircle, url: '/help/hours' },
    { title: 'Technical Support', icon: Info, url: '/help/technical' },
  ]

  return (
    <div className="space-y-2">
      {guides.map((guide, index) => (
        <a
          key={index}
          href={guide.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <guide.icon className="w-4 h-4 text-blue-600" />
          <span className="text-sm">{guide.title}</span>
          <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
        </a>
      ))}
    </div>
  )
}

// Main Help Widget Component
export const HelpWidget: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('search')

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`transition-all duration-300 ${
          isExpanded ? 'w-80 h-96' : 'w-12 h-12'
        }`}
      >
        {isExpanded ? (
          <Card className="w-full h-full flex flex-col shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Help Center</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search">Search</TabsTrigger>
                  <TabsTrigger value="guides">Guides</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              <TabsContent value="search" className="h-full">
                <SmartHelpSearch />
              </TabsContent>

              <TabsContent value="guides" className="h-full overflow-y-auto">
                <QuickGuides />
              </TabsContent>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-12 h-12 rounded-full shadow-lg"
            variant="default"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Feature Tour Component
export const FeatureTour: React.FC<{
  steps: TourStep[]
  title: string
  onComplete?: () => void
  trigger: React.ReactNode
}> = ({ steps, title, onComplete, trigger }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set<number>())

  const progress = (completedSteps.size / steps.length) * 100

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]))
    
    if (stepIndex === currentStep && stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1)
    }
  }

  const handleComplete = () => {
    setIsOpen(false)
    onComplete?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {React.cloneElement(trigger as React.ReactElement, {
          onClick: () => setIsOpen(true)
        })}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length} ({Math.round(progress)}% complete)
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-4">
            {/* Steps sidebar */}
            <div className="w-1/3 space-y-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    index === currentStep
                      ? 'bg-blue-100 border border-blue-200'
                      : completedSteps.has(index)
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2">
                    {completedSteps.has(index) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : index === currentStep ? (
                      <Circle className="w-4 h-4 text-blue-600 fill-current" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">
                      {step.title || `Step ${index + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Current step content */}
            <div className="flex-1">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">
                  {steps[currentStep]?.title || `Step ${currentStep + 1}`}
                </h4>
                <p className="text-gray-600 mb-4">{steps[currentStep]?.content}</p>
                
                <Button
                  onClick={() => markStepComplete(currentStep)}
                  disabled={completedSteps.has(currentStep)}
                  size="sm"
                >
                  {completedSteps.has(currentStep) ? 'Completed' : 'Mark Complete'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!completedSteps.has(currentStep)}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={completedSteps.size < steps.length}
                >
                  Complete Tour
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Help System Export
export const HelpSystem = {
  Widget: HelpWidget,
  Assistant: HelpAssistant,
  Tooltip: HelpTooltip,
  Tour: FeatureTour,
  Search: SmartHelpSearch,
}

export default HelpSystem