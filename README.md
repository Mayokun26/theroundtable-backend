# TheRoundTable - AI Historical Conversations Platform

> **Portfolio Project**: Full-stack application demonstrating advanced AI integration, AWS cloud architecture, and conversational system design.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-theroundtableai.com-blue?style=for-the-badge)](https://theroundtableai.com)
[![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20S3%20%7C%20CloudFront-orange?style=for-the-badge)](https://aws.amazon.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green?style=for-the-badge)](https://openai.com)

## 🎯 Project Overview

TheRoundTable enables users to host conversations with historical figures, powered by advanced AI and sophisticated character modeling. Users select 2-3 historical figures who then engage in dynamic, contextual discussions based on their authentic beliefs, relationships, and personalities.

**🔥 Key Innovation**: Unlike simple chatbots, this system features **conviction-based responses** where characters interject when topics they deeply care about are mentioned, creating authentic multi-party conversations.

## 🏗️ Technical Architecture

### Backend (Node.js + AWS Lambda)
- **Serverless Architecture**: AWS Lambda with Express.js for scalable API deployment
- **Advanced AI Integration**: OpenAI GPT-4o with custom prompt engineering for character authenticity
- **Intelligent Conversation System**: Multi-round discussion engine with conviction-based interruptions
- **Smart Message Classification**: Intent detection for appropriate response calibration (casual vs deep topics)
- **Relationship Matrix**: 50 characters × 49 relationships = 2,450 unique interpersonal dynamics

### Frontend (Next.js + TypeScript)
- **Modern React Stack**: Next.js 13+ with TypeScript for type safety and performance
- **Material-UI Design**: Professional, responsive interface with custom theming
- **Real-time Interactions**: Dynamic character selection and conversation management
- **Static Site Generation**: Optimized for CDN delivery and SEO

### AWS Cloud Infrastructure
- **Frontend**: S3 + CloudFront for global content delivery
- **Backend**: Lambda functions for serverless API execution
- **Deployment**: Automated CI/CD with infrastructure as code
- **Security**: Proper secrets management and CORS configuration

## 🧠 Advanced AI Features

### Conviction-Based Response System
Each of the 50 historical figures has:
- **Core Beliefs** (3-5 fundamental principles with conviction scores 1-10)
- **Topic Triggers** (keywords that activate passionate responses)
- **Relationship Dynamics** (how they address and react to other figures)

```javascript
// Example: Socrates conviction system
core_beliefs: [
  {
    statement: "The unexamined life is not worth living",
    conviction: 10,
    triggers: ["philosophy", "self-knowledge", "wisdom"],
    context: "Will always defend philosophical inquiry"
  }
]
```

### Dynamic Conversation Flow
- **Multi-Round Discussions**: Characters build on each other's responses
- **Authentic Interruptions**: High-conviction topics trigger out-of-turn responses
- **Context Retention**: Full conversation history maintained for coherent dialogue
- **Smart Response Calibration**: Brief responses for casual topics, deep engagement for complex questions

## 🎨 Character Development

### 50 Historical Figures with Full Personalities
- **Philosophers**: Socrates, Plato, Aristotle, Marcus Aurelius
- **Scientists**: Einstein, Marie Curie, Newton, Tesla, Darwin
- **Leaders**: Caesar, Napoleon, Alexander the Great, Catherine the Great
- **Artists**: Shakespeare, Mozart, Leonardo da Vinci, Frida Kahlo
- **Visionaries**: Gandhi, Joan of Arc, Martin Luther King Jr., Rosa Parks

Each character features:
- Historically accurate personality and speech patterns
- Unique relationship dynamics with other figures
- Conviction-based response triggers
- Era-appropriate knowledge and perspectives

## 🛠️ Development Highlights

### Problem-Solving Examples
1. **WSL Git Limitations**: Developed hybrid workflow for large repository management
2. **Conversation Flow**: Built sophisticated turn-taking system preventing repetitive responses
3. **Character Authenticity**: Extensive research and prompt engineering for historical accuracy
4. **Scalable Architecture**: Serverless design supporting concurrent users without infrastructure management

### Technical Decisions
- **GPT-4o Over GPT-3.5**: Dramatic improvement in character consistency and authenticity
- **Conviction System**: Novel approach to multi-party AI conversations beyond simple turn-taking
- **Intent Classification**: Smart response calibration based on message context and complexity
- **Relationship Matrices**: Complex character interaction system for authentic historical dynamics

## 🚀 Deployment & DevOps

### Automated Deployment Pipeline
```bash
# Frontend deployment
npm run deploy  # Builds, uploads to S3, invalidates CloudFront

# Backend deployment  
npm run build:lambda
aws lambda update-function-code --function-name theroundtable-backend-dev
```

### Infrastructure Management
- **Terraform**: Infrastructure as code for reproducible deployments
- **Environment Management**: Separate dev/prod configurations
- **Monitoring**: CloudWatch integration for performance tracking
- **Security**: Proper secrets management and CORS policies

## 🎯 Business & Product Thinking

### Scalability Considerations
- **Character Limit**: Deliberately constrained to 50 high-quality figures vs. hundreds of generic ones
- **Performance**: Optimized for mobile responsiveness and fast load times
- **Cost Management**: Efficient API usage and caching strategies
- **User Experience**: Focus on meaningful conversations over feature bloat

### Technical Product Decisions
- **Quality Over Quantity**: 50 deeply researched characters vs. 500 shallow ones
- **Conversation Depth**: Multi-round discussions vs. simple Q&A
- **Historical Accuracy**: Extensive research for authentic personalities
- **Mobile-First**: Responsive design for accessibility across devices

## 🏆 Professional Skills Demonstrated

### Full-Stack Development
- ✅ **Frontend**: React, Next.js, TypeScript, Material-UI
- ✅ **Backend**: Node.js, Express, serverless architecture
- ✅ **Database**: In-memory storage with plans for DynamoDB integration
- ✅ **APIs**: RESTful design with comprehensive error handling

### Cloud & DevOps
- ✅ **AWS Services**: Lambda, S3, CloudFront, Route 53
- ✅ **Infrastructure as Code**: Terraform for resource management
- ✅ **CI/CD**: Automated deployment pipelines
- ✅ **Monitoring**: CloudWatch integration and logging

### AI & Machine Learning
- ✅ **LLM Integration**: Advanced prompt engineering for GPT-4o
- ✅ **Conversational AI**: Multi-party dialogue systems
- ✅ **Natural Language Processing**: Intent classification and topic analysis
- ✅ **AI Ethics**: Responsible AI implementation with historical accuracy

### Software Engineering
- ✅ **System Design**: Scalable, maintainable architecture
- ✅ **Performance**: Optimized for speed and efficiency
- ✅ **Testing**: Comprehensive error handling and validation
- ✅ **Documentation**: Clear code structure and project documentation

## 📈 Metrics & Performance

- **Response Time**: <2 seconds for AI-generated responses
- **Availability**: 99.9% uptime via AWS infrastructure
- **Scalability**: Serverless architecture supports concurrent users
- **Code Quality**: TypeScript strict mode, ESLint, comprehensive error handling

## 🎨 Live Demo

Visit **[theroundtableai.com](https://theroundtableai.com)** to experience the application.

**Suggested Demo Flow**:
1. Select Einstein, Shakespeare, and Caesar
2. Ask: "What is the meaning of life?"
3. Observe the dynamic conversation flow and character interactions
4. Try a casual greeting like "Hi" to see intelligent response calibration

## 💼 Career Transition Focus

This project demonstrates my transition from **DevOps to MLOps** by showcasing:
- **AI/ML Integration**: Practical LLM implementation and prompt engineering
- **Cloud Architecture**: Serverless, scalable systems design
- **Product Thinking**: User-centric feature development and technical decision-making
- **Full-Stack Capability**: End-to-end development and deployment

**Target Role**: MLOps Engineer combining my DevOps expertise with demonstrated AI/ML capabilities.

---

*Built with ❤️ as a portfolio demonstration of modern full-stack development, AI integration, and cloud architecture.*
