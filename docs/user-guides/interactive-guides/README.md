# Interactive Help System and Guides

This section describes the interactive help system integrated within the HeyPeter Academy platform, providing contextual assistance and guided tours for all users.

## Table of Contents

1. [Interactive Help System Overview](#interactive-help-system-overview)
2. [Contextual Help Features](#contextual-help-features)
3. [Guided Tours and Walkthroughs](#guided-tours-and-walkthroughs)
4. [Smart Help Assistant](#smart-help-assistant)
5. [Interactive Tutorials](#interactive-tutorials)
6. [Help Widget Integration](#help-widget-integration)
7. [User Onboarding Flows](#user-onboarding-flows)
8. [Progressive Disclosure](#progressive-disclosure)
9. [Implementation Guidelines](#implementation-guidelines)
10. [Analytics and Optimization](#analytics-and-optimization)

## Interactive Help System Overview

The HeyPeter Academy platform features a comprehensive interactive help system designed to provide users with immediate, contextual assistance without leaving their current workflow.

### Key Features
- **Contextual Help:** Relevant help content based on current page/action
- **Interactive Tours:** Step-by-step guided walkthroughs
- **Smart Search:** AI-powered help content discovery
- **Progressive Disclosure:** Information revealed as needed
- **Multi-modal Support:** Text, video, and interactive elements
- **Personalization:** Adaptive content based on user role and experience

### Design Principles
- **Non-intrusive:** Help available when needed, hidden when not
- **Contextual:** Relevant to user's current task or location
- **Progressive:** Information complexity increases with user needs
- **Accessible:** Support for users with different abilities
- **Responsive:** Works across all devices and screen sizes

## Contextual Help Features

### Help Tooltips
Interactive tooltips provide instant clarification for UI elements:

```javascript
// Example tooltip implementation
const HelpTooltip = ({ content, trigger, placement = "top" }) => (
  <Tooltip
    content={
      <div className="max-w-xs p-3">
        <p className="text-sm text-gray-700">{content}</p>
        {trigger.helpLink && (
          <Link 
            href={trigger.helpLink}
            className="text-blue-600 text-xs mt-2 block"
          >
            Learn more →
          </Link>
        )}
      </div>
    }
    placement={placement}
    interactive
  >
    {trigger.element}
  </Tooltip>
)
```

### Page-Specific Help Panels
Each major page includes a collapsible help panel with relevant information:

```jsx
const PageHelpPanel = ({ pageId, userRole }) => {
  const helpContent = getHelpContent(pageId, userRole)
  
  return (
    <Collapsible>
      <CollapsibleTrigger className="help-panel-trigger">
        <HelpCircle className="w-4 h-4" />
        Page Help
      </CollapsibleTrigger>
      <CollapsibleContent className="help-panel-content">
        <div className="space-y-4">
          <h3>Quick Help</h3>
          <ul className="space-y-2">
            {helpContent.quickTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                <span className="text-sm">{tip}</span>
              </li>
            ))}
          </ul>
          
          <div className="border-t pt-4">
            <h4>Related Resources</h4>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {helpContent.resources.map((resource, index) => (
                <Link
                  key={index}
                  href={resource.url}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                >
                  {resource.type === 'video' && <Play className="w-4 h-4" />}
                  {resource.type === 'guide' && <BookOpen className="w-4 h-4" />}
                  {resource.type === 'faq' && <MessageCircle className="w-4 h-4" />}
                  <span className="text-sm">{resource.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### Smart Help Search
Intelligent search functionality that understands context and user intent:

```jsx
const SmartHelpSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  
  const searchHelp = useDebouncedCallback(async (searchQuery) => {
    const searchResults = await searchHelpContent({
      query: searchQuery,
      userRole: user.role,
      currentPage: router.pathname,
      userLevel: user.level
    })
    
    setResults(searchResults.results)
    setSuggestions(searchResults.suggestions)
  }, 300)
  
  return (
    <div className="help-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search help articles, guides, and tutorials..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            searchHelp(e.target.value)
          }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Search Results */}
      {results.length > 0 && (
        <div className="search-results mt-4 space-y-2">
          {results.map((result, index) => (
            <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{result.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{result.excerpt}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{result.category}</Badge>
                    <span className="text-xs text-gray-500">{result.type}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions mt-4">
          <h5 className="text-sm font-medium mb-2">Suggested Topics</h5>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
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
```

## Guided Tours and Walkthroughs

### New User Onboarding Tour
Comprehensive guided tour for new users:

```jsx
const OnboardingTour = ({ userType, isFirstLogin }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isActive, setIsActive] = useState(isFirstLogin)
  
  const tourSteps = useMemo(() => {
    return getTourSteps(userType) // Different steps for students, teachers, admins
  }, [userType])
  
  const tourConfig = {
    steps: tourSteps,
    showProgress: true,
    showSkip: true,
    showPrevious: true,
    onComplete: () => {
      setIsActive(false)
      trackEvent('onboarding_tour_completed', { userType, completionRate: 100 })
    },
    onSkip: () => {
      setIsActive(false)
      trackEvent('onboarding_tour_skipped', { 
        userType, 
        stepCompleted: currentStep,
        completionRate: (currentStep / tourSteps.length) * 100
      })
    }
  }
  
  return (
    <Joyride
      steps={tourSteps}
      run={isActive}
      stepIndex={currentStep}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        beacon: {
          innerColor: '#3B82F6',
          outerColor: '#3B82F6',
        }
      }}
      callback={(data) => {
        const { action, index, status, type } = data
        
        if (action === 'next') {
          setCurrentStep(index + 1)
        } else if (action === 'prev') {
          setCurrentStep(index - 1)
        } else if (status === 'finished') {
          tourConfig.onComplete()
        } else if (status === 'skipped') {
          tourConfig.onSkip()
        }
      }}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour'
      }}
    />
  )
}

// Tour steps configuration
const getTourSteps = (userType) => {
  const commonSteps = [
    {
      target: '.navbar',
      content: 'This is your main navigation. Access all platform features from here.',
      placement: 'bottom'
    },
    {
      target: '.user-profile',
      content: 'Your profile menu - manage account settings and preferences.',
      placement: 'bottom-start'
    }
  ]
  
  const studentSteps = [
    ...commonSteps,
    {
      target: '.hour-balance',
      content: 'Your hour balance shows available class time. Click to purchase more hours.',
      placement: 'bottom'
    },
    {
      target: '.book-class-btn',
      content: 'Book your classes here. Choose from available time slots and teachers.',
      placement: 'top'
    },
    {
      target: '.progress-tracker',
      content: 'Track your learning progress and see your improvements over time.',
      placement: 'left'
    }
  ]
  
  const teacherSteps = [
    ...commonSteps,
    {
      target: '.availability-calendar',
      content: 'Set your teaching availability here. Students can book during these times.',
      placement: 'top'
    },
    {
      target: '.class-management',
      content: 'Manage your classes, view student rosters, and track attendance.',
      placement: 'bottom'
    },
    {
      target: '.teacher-analytics',
      content: 'View your teaching performance metrics and student feedback.',
      placement: 'left'
    }
  ]
  
  const adminSteps = [
    ...commonSteps,
    {
      target: '.admin-dashboard',
      content: 'Your admin dashboard - monitor platform performance and key metrics.',
      placement: 'bottom'
    },
    {
      target: '.user-management',
      content: 'Manage all users - students, teachers, and administrators.',
      placement: 'right'
    },
    {
      target: '.system-settings',
      content: 'Configure platform settings, integrations, and security options.',
      placement: 'left'
    }
  ]
  
  switch (userType) {
    case 'student': return studentSteps
    case 'teacher': return teacherSteps
    case 'admin': return adminSteps
    default: return commonSteps
  }
}
```

### Feature-Specific Walkthroughs
Targeted tours for specific features:

```jsx
const FeatureTour = ({ feature, trigger }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const featureSteps = {
    'class-booking': [
      {
        target: '.course-filter',
        content: 'Start by selecting your course type. This filters available classes.',
        placement: 'bottom'
      },
      {
        target: '.teacher-selection',
        content: 'Choose your preferred teacher or try different teaching styles.',
        placement: 'top'
      },
      {
        target: '.time-slots',
        content: 'Pick a time that works for your schedule. Available slots are highlighted.',
        placement: 'left'
      },
      {
        target: '.booking-confirmation',
        content: 'Review your selection and confirm. Hours will be deducted upon confirmation.',
        placement: 'top'
      }
    ],
    'hour-management': [
      {
        target: '.hour-balance-card',
        content: 'Your current hour balance. Different courses use different amounts.',
        placement: 'bottom'
      },
      {
        target: '.purchase-options',
        content: 'Choose from different package sizes. Larger packages offer better value.',
        placement: 'right'
      },
      {
        target: '.usage-history',
        content: 'Track how you\'ve used your hours and plan future purchases.',
        placement: 'left'
      }
    ]
    // Add more feature tours as needed
  }
  
  return (
    <>
      {React.cloneElement(trigger, {
        onClick: () => setIsOpen(true)
      })}
      
      <Joyride
        steps={featureSteps[feature] || []}
        run={isOpen}
        continuous
        showProgress
        showSkipButton
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setIsOpen(false)
          }
        }}
      />
    </>
  )
}
```

## Smart Help Assistant

### AI-Powered Chat Assistant
Intelligent chat assistant for instant help:

```jsx
const HelpAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  
  const sendMessage = async (message) => {
    const userMessage = { role: 'user', content: message, timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    
    try {
      const response = await fetch('/api/help-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: {
            userRole: user.role,
            currentPage: router.pathname,
            userLevel: user.level,
            previousMessages: messages.slice(-5) // Last 5 messages for context
          }
        })
      })
      
      const data = await response.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        suggestions: data.suggestions,
        resources: data.resources,
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Help assistant error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try contacting support directly.',
        timestamp: Date.now()
      }])
    } finally {
      setIsTyping(false)
    }
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 shadow-lg"
        variant={isOpen ? "secondary" : "default"}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-blue-50 rounded-t-lg">
            <h3 className="font-medium">Help Assistant</h3>
            <p className="text-sm text-gray-600">Ask me anything about the platform</p>
          </div>
          
          {/* Messages */}
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
                  
                  {/* Assistant suggestions and resources */}
                  {message.role === 'assistant' && message.suggestions && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-1 text-blue-600"
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
                        <Link
                          key={idx}
                          href={resource.url}
                          className="block text-xs text-blue-600 hover:underline"
                        >
                          📖 {resource.title}
                        </Link>
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
          
          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isTyping} />
        </div>
      )}
    </div>
  )
}

const ChatInput = ({ onSend, disabled }) => {
  const [input, setInput] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          disabled={disabled}
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" disabled={!input.trim() || disabled} size="sm">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}
```

## Interactive Tutorials

### In-App Tutorial System
Embedded tutorials that users can complete within the platform:

```jsx
const InteractiveTutorial = ({ tutorialId, title, steps, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [isActive, setIsActive] = useState(false)
  
  const markStepComplete = (stepIndex) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]))
    
    // Auto-advance to next step
    if (stepIndex === currentStep && stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1)
    }
  }
  
  const progress = (completedSteps.size / steps.length) * 100
  
  return (
    <Dialog open={isActive} onOpenChange={setIsActive}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsActive(true)}>
          <PlayCircle className="w-4 h-4 mr-2" />
          Start Tutorial: {title}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length} ({Math.round(progress)}% complete)
            </p>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Steps sidebar */}
            <div className="w-1/3 border-r overflow-y-auto">
              <div className="p-4 space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      index === currentStep
                        ? 'bg-blue-100 border-blue-200'
                        : completedSteps.has(index)
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className="flex items-center gap-2">
                      {completedSteps.has(index) ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : index === currentStep ? (
                        <Circle className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tutorial content */}
            <div className="flex-1 overflow-y-auto">
              <TutorialStep
                step={steps[currentStep]}
                stepIndex={currentStep}
                onComplete={() => markStepComplete(currentStep)}
                isCompleted={completedSteps.has(currentStep)}
              />
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
                onClick={() => {
                  onComplete?.(tutorialId, completedSteps.size, steps.length)
                  setIsActive(false)
                }}
                disabled={completedSteps.size < steps.length}
              >
                Complete Tutorial
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const TutorialStep = ({ step, stepIndex, onComplete, isCompleted }) => {
  const [userInput, setUserInput] = useState('')
  const [isValid, setIsValid] = useState(false)
  
  useEffect(() => {
    if (step.validation) {
      setIsValid(step.validation(userInput))
    }
  }, [userInput, step.validation])
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-gray-600">{step.description}</p>
      </div>
      
      {/* Step content based on type */}
      {step.type === 'explanation' && (
        <div className="space-y-4">
          {step.content.map((item, index) => (
            <div key={index}>
              {item.type === 'text' && <p>{item.content}</p>}
              {item.type === 'image' && (
                <img src={item.src} alt={item.alt} className="max-w-full h-auto rounded-lg" />
              )}
              {item.type === 'video' && (
                <video controls className="max-w-full h-auto rounded-lg">
                  <source src={item.src} type="video/mp4" />
                </video>
              )}
            </div>
          ))}
          
          <Button onClick={onComplete} disabled={isCompleted}>
            {isCompleted ? 'Completed' : 'Mark as Complete'}
          </Button>
        </div>
      )}
      
      {step.type === 'interactive' && (
        <div className="space-y-4">
          <p>{step.instruction}</p>
          
          {step.inputType === 'text' && (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={step.placeholder}
              className="w-full p-2 border rounded-md"
            />
          )}
          
          {step.inputType === 'select' && (
            <select
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select an option...</option>
              {step.options.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          
          <Button
            onClick={onComplete}
            disabled={!isValid || isCompleted}
          >
            {isCompleted ? 'Completed' : 'Submit Answer'}
          </Button>
          
          {userInput && !isValid && (
            <p className="text-red-600 text-sm">{step.validationMessage}</p>
          )}
        </div>
      )}
      
      {step.type === 'simulation' && (
        <div className="space-y-4">
          <p>{step.instruction}</p>
          <div className="border rounded-lg p-4 bg-gray-50">
            {/* Simulation component would be rendered here */}
            <p className="text-center text-gray-600">
              Interactive simulation component
            </p>
          </div>
          <Button onClick={onComplete} disabled={isCompleted}>
            {isCompleted ? 'Completed' : 'Complete Simulation'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

## Help Widget Integration

### Floating Help Widget
A persistent help widget that provides quick access to assistance:

```jsx
const HelpWidget = () => {
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="search">Search</TabsTrigger>
                  <TabsTrigger value="guides">Guides</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
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
              
              <TabsContent value="contact" className="h-full">
                <ContactSupport />
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

const QuickGuides = () => {
  const guides = [
    { title: 'Getting Started', icon: Play, url: '/help/getting-started' },
    { title: 'Booking Classes', icon: Calendar, url: '/help/booking' },
    { title: 'Managing Hours', icon: Clock, url: '/help/hours' },
    { title: 'Technical Support', icon: Settings, url: '/help/technical' },
  ]
  
  return (
    <div className="space-y-2">
      {guides.map((guide, index) => (
        <Link
          key={index}
          href={guide.url}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <guide.icon className="w-4 h-4 text-blue-600" />
          <span className="text-sm">{guide.title}</span>
          <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
        </Link>
      ))}
    </div>
  )
}

const ContactSupport = () => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <MessageCircle className="w-8 h-8 mx-auto text-blue-600 mb-2" />
        <h4 className="font-medium">Need Personal Help?</h4>
        <p className="text-sm text-gray-600 mt-1">
          Our support team is here to help
        </p>
      </div>
      
      <div className="space-y-2">
        <Button className="w-full" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Email Support
        </Button>
        
        <Button variant="outline" className="w-full" size="sm">
          <MessageSquare className="w-4 h-4 mr-2" />
          Live Chat
        </Button>
        
        <Button variant="outline" className="w-full" size="sm">
          <Phone className="w-4 h-4 mr-2" />
          Schedule Call
        </Button>
      </div>
      
      <div className="text-center text-xs text-gray-500">
        <p>Response time: Usually within 2 hours</p>
        <p>Available: Monday-Friday, 9 AM - 6 PM GMT</p>
      </div>
    </div>
  )
}
```

## Implementation Guidelines

### Technical Requirements
```typescript
// Help system configuration
interface HelpSystemConfig {
  // Content management
  contentApiUrl: string
  searchEndpoint: string
  
  // Feature flags
  enableTours: boolean
  enableChatAssistant: boolean
  enableInteractiveTutorials: boolean
  
  // Personalization
  adaptToUserRole: boolean
  trackUserProgress: boolean
  
  // Analytics
  trackingEnabled: boolean
  analyticsEndpoint: string
}

// Help content structure
interface HelpContent {
  id: string
  title: string
  content: string
  type: 'article' | 'video' | 'tutorial' | 'faq'
  category: string
  tags: string[]
  userRoles: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  lastUpdated: Date
  searchKeywords: string[]
}

// Tour step configuration
interface TourStep {
  target: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  action?: 'click' | 'hover' | 'focus'
  waitForElement?: boolean
  showProgress?: boolean
}
```

### Content Management System
```jsx
// Help content provider
const HelpContentProvider = ({ children }) => {
  const [content, setContent] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadHelpContent()
  }, [])
  
  const loadHelpContent = async () => {
    try {
      const response = await fetch('/api/help/content')
      const data = await response.json()
      setContent(data)
    } catch (error) {
      console.error('Failed to load help content:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const searchContent = (query, filters = {}) => {
    return content.filter(item => {
      // Text search
      const textMatch = item.title.toLowerCase().includes(query.toLowerCase()) ||
                       item.content.toLowerCase().includes(query.toLowerCase()) ||
                       item.searchKeywords.some(keyword => 
                         keyword.toLowerCase().includes(query.toLowerCase())
                       )
      
      // Filter by user role
      const roleMatch = !filters.userRole || 
                       item.userRoles.includes(filters.userRole) ||
                       item.userRoles.includes('all')
      
      // Filter by category
      const categoryMatch = !filters.category || item.category === filters.category
      
      return textMatch && roleMatch && categoryMatch
    })
  }
  
  const getContentById = (id) => content.find(item => item.id === id)
  
  const value = {
    content,
    loading,
    searchContent,
    getContentById,
    refreshContent: loadHelpContent
  }
  
  return (
    <HelpContentContext.Provider value={value}>
      {children}
    </HelpContentContext.Provider>
  )
}
```

## Analytics and Optimization

### Help System Analytics
Track usage patterns to optimize the help system:

```typescript
// Analytics tracking
interface HelpAnalytics {
  // User interactions
  trackHelpSearch: (query: string, results: number, userRole: string) => void
  trackTourStart: (tourId: string, userRole: string) => void
  trackTourComplete: (tourId: string, completionRate: number) => void
  trackTutorialStart: (tutorialId: string, userRole: string) => void
  trackContentView: (contentId: string, contentType: string) => void
  
  // Performance metrics
  trackSearchPerformance: (query: string, responseTime: number) => void
  trackContentEffectiveness: (contentId: string, wasHelpful: boolean) => void
  
  // User journey
  trackHelpJourney: (steps: string[], outcome: 'resolved' | 'escalated') => void
}

// Usage analytics component
const HelpAnalytics = () => {
  useEffect(() => {
    // Track help system engagement
    const trackEngagement = () => {
      const metrics = {
        helpWidgetOpened: localStorage.getItem('help_widget_opened') || 0,
        toursCompleted: localStorage.getItem('tours_completed') || 0,
        tutorialsCompleted: localStorage.getItem('tutorials_completed') || 0,
        averageSessionDuration: getAverageSessionDuration(),
        mostViewedContent: getMostViewedContent(),
        commonSearchQueries: getCommonSearchQueries()
      }
      
      // Send analytics data
      fetch('/api/analytics/help-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      })
    }
    
    // Track engagement daily
    const interval = setInterval(trackEngagement, 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  
  return null
}
```

### Continuous Improvement
```typescript
// A/B testing for help content
const HelpContentExperiment = ({ contentId, variants, children }) => {
  const [selectedVariant, setSelectedVariant] = useState(null)
  
  useEffect(() => {
    // Select variant based on user ID
    const userId = getCurrentUserId()
    const variantIndex = userId ? userId.charCodeAt(0) % variants.length : 0
    setSelectedVariant(variants[variantIndex])
    
    // Track which variant was shown
    trackEvent('help_content_variant_shown', {
      contentId,
      variant: selectedVariant.id,
      userId
    })
  }, [contentId, variants])
  
  if (!selectedVariant) return null
  
  return React.cloneElement(children, {
    content: selectedVariant.content,
    onInteraction: (action) => {
      trackEvent('help_content_interaction', {
        contentId,
        variant: selectedVariant.id,
        action
      })
    }
  })
}
```

---

*The interactive help system is designed to evolve based on user feedback and usage patterns. Regular updates ensure the help content remains accurate and useful for all platform users.*