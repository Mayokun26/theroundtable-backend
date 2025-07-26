# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Considerations

**CRITICAL CONSTRAINTS** - Adhere strictly to these for the entire session:

- **Only edit files that already exist. Do not create new files.**
- **Before taking any action, always explain your reasoning step by step and state your intended changes out loud, Devin-style.**
- **Do not make assumptions about files, dependencies, or system state that are not explicitly mentioned.**
- **Confirm the plan with the user before showing any code.**
- **Ask questions for multiple rounds until you fully understand the requirements.**
- **You might not have access to .env or .gitignore files.**
- **NO LOCAL DEVELOPMENT - All work is done for AWS deployment only.**

## Git Workflow - IMPORTANT

**WSL Git Limitation**: Due to WSL networking issues with large repositories (262MB+), git push operations will timeout from within WSL.

**WSL Build Limitation**: DO NOT run npm builds (npm run build, npm run deploy) in WSL as they consume excessive resources and timeout. All builds must be run from PowerShell.

**Required Workflow:**
1. **Make all code changes** in WSL/Claude Code as normal
2. **Commit changes locally** in WSL using standard git commands
3. **NEVER attempt git push from WSL** - it will timeout
4. **Provide PowerShell instructions** to the user for pushing changes
5. **User must run git push from Windows PowerShell** terminal

**PowerShell Commands to Provide:**
```powershell
cd "C:\Users\Oreko\work\theroundtable"
git status
git push origin [branch-name]
gh pr create --title "[title]" --body "[description]"
```

**Important**: Always provide absolute path commands to avoid directory confusion:
- For git operations: Start with `cd "C:\Users\Oreko\work\theroundtable"`
- For frontend operations: Start with `cd "C:\Users\Oreko\work\theroundtable\theroundtable-frontend"`
- For backend operations: Start with `cd "C:\Users\Oreko\work\theroundtable\theroundtable-backend"`

**This workflow is mandatory** - do not attempt WSL git push operations.

## Overview

TheRoundTable is a full-stack application for AI-powered conversations with historical figures. It consists of a Next.js frontend and Node.js/Express backend, deployed on AWS infrastructure.

## Repository Structure

The application is split across separate GitHub repositories:
- **Frontend**: https://github.com/Mayokun26/theroundtable-frontend
- **Backend**: https://github.com/Mayokun26/theroundtable-backend

**Note**: The current workspace contains both frontend and backend in subdirectories (`theroundtable-frontend/` and `theroundtable-backend/`), but the actual development and deployment happens from separate repositories.

## Development Commands

### Frontend (theroundtable-frontend)
```bash
cd theroundtable-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test            # Run tests
npm run deploy      # Build and deploy to AWS (includes S3 upload + CloudFront invalidation)
npm run deploy-local # Build and create Docker image (local development only)
```

### Backend (theroundtable-backend)
```bash
cd theroundtable-backend
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test            # Run tests
npm run deploy      # Build and create Docker image
```

### Lambda Deployment (theroundtable-backend)
**Note**: The standard `npm run build:lambda` zip creation fails. Use this PowerShell workflow instead:
```powershell
cd "C:\Users\Oreko\work\TheRoundTable\theroundtable-backend"
npm run build:lambda
cd dist
Compress-Archive -Path * -DestinationPath lambda.zip -Force
aws lambda update-function-code --function-name theroundtable-backend-dev --zip-file fileb://lambda.zip
```

### Infrastructure
```bash
# From root directory
./scripts/validate-infrastructure.ps1  # Validate Terraform configuration
./scripts/deploy.ps1                   # Deploy frontend and/or backend
```

## Architecture

### Backend Structure
- **Entry Point**: `src/index.ts` - Initializes DynamoDB, Redis, and starts the server
- **Server Setup**: `src/server.ts` - Express app configuration with middleware
- **Routes**: RESTful API endpoints in `src/routes/`
  - `/api/health` - Health check endpoint
  - `/api/characters` - Character management
  - `/api/conversations` - Conversation handling
- **Database**: DynamoDB with AWS SDK for character and conversation data
- **Caching**: Redis for session management and performance optimization
- **Services**: AI integration through OpenAI API
- **Middleware**: Error handling, request logging, rate limiting, CORS

### Frontend Structure
- **Framework**: Next.js with TypeScript
- **UI Library**: Material-UI (MUI) with custom theme
- **State Management**: React Query for API state, local state for UI
- **Authentication**: AWS Amplify integration
- **Routing**: Next.js file-based routing
- **Components**: Reusable UI components in `src/components/`

### Key Configuration Files
- **Backend**: `tsconfig.json` uses CommonJS, path aliases with `@/*`
- **Frontend**: `tsconfig.json` uses Next.js plugin, path aliases with `@/*`
- **Both**: ESLint and TypeScript strict mode enabled

## Environment Setup

### Required Environment Variables
Backend requires:
- Database connection (DynamoDB via AWS SDK)
- Redis connection (optional, falls back gracefully)
- OpenAI API key
- AWS credentials for deployment

Frontend requires:
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

### Development Prerequisites
- Node.js v18+
- Redis (optional for development)
- DynamoDB access (via AWS credentials)
- AWS credentials (for deployment)
- Docker (for containerization)

## Testing and Quality

Both frontend and backend have:
- Jest testing framework
- TypeScript strict mode
- ESLint configuration
- Type checking as separate npm script

Always run `npm run lint` and `npm run type-check` before deployment.

## Deployment

The application uses AWS S3 + CloudFront for frontend and AWS Lambda for backend:
- Frontend: Next.js static export deployed to S3 with CloudFront CDN
- Backend: Node.js Express server deployed to AWS Lambda
- Infrastructure: Terraform modules for AWS resources

### Frontend Deployment (Updated)
The frontend deployment is now fully integrated with AWS:

```bash
cd theroundtable-frontend
npm run deploy      # Complete AWS deployment (build + S3 upload + CloudFront invalidation)
```

This command:
1. Builds the Next.js static export
2. Uploads files to S3 bucket
3. Invalidates CloudFront cache for immediate updates
4. Deploys to https://theroundtableai.com

### Backend Deployment
```bash
cd theroundtable-backend
npm run deploy      # Build and create Docker image for Lambda deployment
```

### Infrastructure Deployment
```bash
# From root directory
./infrastructure/scripts/final-deploy.ps1  # Complete AWS infrastructure deployment
```

### Development vs Production Commands
- `npm run deploy` - Full AWS deployment (production)
- `npm run deploy-local` - Local Docker build only (development)

**Always run `npm run lint` and `npm run type-check` before deployment.**

## Database and API Integration

- **Character Data**: Stored in DynamoDB, cached in Redis
- **Conversations**: Persistent storage with real-time AI responses
- **Error Handling**: Graceful fallbacks when external services are unavailable
- **Rate Limiting**: Configured to prevent API abuse

## Development Tips

- Backend uses `ts-node-dev` for hot reloading during development
- Frontend development server runs on port 3000, backend on port 3001
- API health checks implemented for service monitoring
- Comprehensive error handling and logging throughout the application

## Character Enhancement Status & Instructions - MASSIVE UNDERTAKING IN PROGRESS

**🎉 MAJOR MILESTONE REACHED - 64% COMPLETE! 🎉**

**FULLY ENHANCED (32/50)** - Complete conviction systems with core beliefs, topic convictions, temperament scores, nicknames, and full relationship matrices:

**PHASE 1 (1-19):** Socrates, Marie Curie, Sun Tzu, Leonardo da Vinci, Cleopatra, Confucius, Einstein, Shakespeare, Caesar, Napoleon, Ada Lovelace, Tesla, Joan of Arc, Plato, Aristotle, Catherine the Great, Malcolm X, Florence Nightingale

**PHASE 2 (20):** Isaac Newton ✅

**PHASE 3 (21-30):** Virginia Woolf, Galileo, Frida Kahlo, Marcus Aurelius, Maya Angelou, Alexander the Great, Jane Austen, Mozart, Rosa Parks, Charles Darwin ✅

**REMAINING CHARACTERS (18/50)** - Need full conviction system enhancement:
Gandhi (#10), Elizabeth I (#31), Pythagoras (#32), Jane Austen (#33), Hannibal (#34), Rumi (#35), Emily Dickinson (#36), Charles Darwin (#37), Michelangelo (#38), Pablo Picasso (#39), Mozart (#40), Alexander the Great (#41), Rosa Parks (#42), Anne Frank (#43), Frederick Douglass (#44), Maya Angelou (#45), Mary Shelley (#46), Avicenna (#47), Ibn al-Haytham (#48), Grace Hopper (#49), Alan Turing (#50)

**LATEST SESSION ACHIEVEMENTS:**
✅ Isaac Newton (#20) - Mathematical laws, divine geometry, empirical method
✅ Maya Angelou (#25) - Resilience, voice, civil rights transformation  
✅ Alexander the Great (#26) - Conquest, glory, leadership, divine ambition
✅ Jane Austen (#27) - Social observation, wit, marriage, domestic harmony
✅ Mozart (#28) - Musical perfection, divine inspiration, harmonic beauty
✅ Rosa Parks (#29) - Civil rights courage, quiet dignity, moral conviction
✅ Charles Darwin (#30) - Evolution, natural selection, evidence-based science

**NEXT STEPS:** Continue with Elizabeth I (#31) and remaining Phase 3 characters (31-50). Only 18 characters remaining!
- File location: /mnt/c/Users/Oreko/work/theroundtable/theroundtable-backend/src/data/characters.js
- Line position: Around line 602 after Confucius common_nicknames
- Next character: Shakespeare (#8) after Confucius completion

**SYSTEMATIC ENHANCEMENT PLAN:**

**Phase 1: Complete Partial Characters** (IN PROGRESS)
- Add temperament scores to Virginia Woolf, Galileo, Frida Kahlo, Marcus Aurelius
- Add common nicknames to all partially enhanced characters
- Build full 49-character relationship matrix for each

**Phase 2: Enhance Characters 4-20** 
- Leonardo da Vinci (#4), Cleopatra (#5), Confucius (#6), Shakespeare (#8), Caesar (#9)
- Napoleon (#11), Ada Lovelace (#12), Tesla (#13), Joan of Arc (#14), Plato (#15) 
- Aristotle (#16), Catherine the Great (#17), Malcolm X (#18), Nightingale (#19), Newton (#20)

**Phase 3: Enhance Characters 25-50**
- Maya Angelou (#25) through Alan Turing (#50)
- 26 characters requiring complete conviction systems and relationship matrices

**Phase 4: Conversation Flow Improvements**
- Direct address priority system (priority 10 for direct questions)
- Acknowledgment rules for natural conversation flow  
- Enhanced turn logic with conviction-based reactions
- Context awareness for who spoke last and conversational threading

**TECHNICAL SCOPE:**
- **Total Relationship Entries**: 50 × 49 = 2,450 relationships
- **File Size Impact**: Monitor characters.js growth for mobile app constraints
- **Deployment**: PowerShell Lambda deployment after completion
- **Token Management**: Update CLAUDE.md after each batch to preserve progress

**PROGRESS TRACKING:** Update this section after each enhancement batch.

**DEPLOYMENT STATUS - CRITICAL NOTES:**
- Enhanced characters are in SOURCE file: `/mnt/c/Users/Oreko/work/Theroundtable/theroundtable-backend/src/data/characters.js`
- Frontend typing effects deployed successfully 
- Backend Lambda deployed with enhanced characters
- "Panel thinking" text now shows "panelist is/are thinking" dynamically
- If changes don't appear, clear browser cache or use incognito mode
- CloudFront cache may take 2-3 minutes to invalidate

**FINAL REDEPLOY COMMANDS IF NEEDED:**
```powershell
cd "C:\Users\Oreko\work\theroundtable\theroundtable-backend"
npm run build:lambda
cd dist
del lambda.zip
Compress-Archive -Path * -DestinationPath lambda.zip -Force
aws lambda update-function-code --function-name theroundtable-backend-dev --zip-file fileb://lambda.zip
```

**HOW TO ENHANCE REMAINING CHARACTERS:**

**File Location**: Work in `/mnt/c/Users/Oreko/work/Theroundtable/theroundtable-backend/dist/data/characters.js` (production file)

**Enhancement Pattern**: Replace basic `style` field with rich personality like this:

```javascript
// BEFORE (generic):
style: 'Direct and authoritative, with strategic brilliance'

// AFTER (rich personality):
style: 'You speak with [characteristic manner]. You often reference [specific experiences/work/relationships]. You discuss [key concepts/beliefs]. You are [personality traits with specific examples]. You [unique behaviors/quirks/perspectives].'
```

**Enhancement Guidelines:**
1. **Historical Accuracy** - Research the person's actual life, work, relationships
2. **Unique Voice** - Give each character distinct speech patterns and concerns
3. **Specific References** - Include real people they knew, places they lived, work they did
4. **Personal Quirks** - Add authentic personality details (Einstein's violin, Tesla's counting in threes)
5. **Cross-References** - Enable them to mention other historical figures when relevant
6. **Conversational** - Write as if they're speaking directly, using "You" perspective

**Priority Order for Remaining Characters:**
- Modern figures (Gandhi #10, Churchill, MLK, etc.)
- Popular historical figures (Alexander the Great, Cleopatra VII, etc.) 
- Scientists and inventors (Darwin, Galileo, etc.)
- Artists and writers (Picasso, Dickens, etc.)

## Dynamic Conversation System (NEW IMPLEMENTATION)

**CORE BELIEFS & CONVICTION SYSTEM:**

Each character now has:
- **Core Beliefs** (3-5 non-negotiable principles) with conviction levels (1-10)
- **Topic Triggers** (keywords that activate strong responses)
- **Conviction Thresholds** (determines when they'll "speak out of turn")

**Data Structure:**
```javascript
{
  core_beliefs: [
    {
      statement: "The unexamined life is not worth living",
      conviction: 10,
      triggers: ["philosophy", "self-knowledge", "wisdom", "ignorance"],
      context: "Will always defend philosophical inquiry"
    }
  ],
  topic_convictions: {
    "justice": 10,
    "virtue": 9,
    "wisdom": 10
  }
}
```

**CONVERSATION ENGINE FEATURES:**

1. **Multi-Round Context**: Characters remember previous conversation rounds
2. **Conviction-Based Responses**: Characters may interject when topics they care about (conviction 8+) are mentioned
3. **Dynamic Panel**: Non-selected characters can join if conviction is triggered (9-10 level)
4. **Cross-References**: Characters reference what others said in previous rounds
5. **Topic Analysis**: Backend analyzes messages for conviction triggers

## CONVERSATION SYSTEM DESIGN PRINCIPLES

**CRITICAL: Avoid Character-Specific Code Solutions**

When refining conversation functionality, avoid hard-coding solutions for specific characters (e.g., "make Einstein more concise for math questions"). Instead, focus on systemic/logic-level solutions that address root causes:

**❌ BAD APPROACH:**
```javascript
// Don't do this - fixes one example but misses infinite similar cases
if (character.name === 'Einstein' && isSimpleQuestion) {
  systemPrompt += "Be more concise";
}
```

**✅ GOOD APPROACH:**
```javascript
// System-level solution that handles all characters and question types
const isSimpleFactual = /^(what\s+(is\s+)?(\d+\s*[\+\-\*\/]\s*\d+)|\d+\s*[\+\-\*\/]\s*\d+)(\?)?$/i.test(message.trim());
if (isSimpleFactual) {
  systemPrompt += "CONTEXT: This is a simple factual question in casual conversation. Stay in character but be appropriately brief - give the direct answer plus one brief personal comment. Even you wouldn't lecture about 2+2.";
}
```

**IMPLEMENTED SOLUTION - Context-Aware Response Length:**
Characters always stay in character, but response length adapts to conversational context. Simple factual questions (like "what's 2+2?" or "count to 3") trigger briefer responses while maintaining character authenticity. This works for all 50 characters systemically.

**WHY THIS MATTERS:**
- Character-specific fixes create maintenance debt
- Root logic flaws will manifest in infinite other examples
- Systemic solutions scale across all 50 characters
- Better to reach consensus on whether issues are worth addressing at program level

**DECISION FRAMEWORK:**
1. Identify the root cause (not just the symptom)
2. Evaluate if it's worth fixing systemically 
3. If yes, implement logic-level solution
4. If no, document as "acceptable behavior" and move on

This principle applies to all conversation flow refinements as we continue development.

**IMPLEMENTATION STATUS:**
- [COMPLETED] Core beliefs for 5 pilot characters
- [COMPLETED] Conviction-based response system  
- [COMPLETED] Multi-round context tracking
- [COMPLETED] Interpersonal relationship matrix for pilots
- [COMPLETED] Dynamic panel membership (conviction-triggered responses)
- [PENDING] Scale to remaining 45 characters

**PILOT CHARACTERS COMPLETE (5/50):**
- **Socrates**: Philosophy (10), Wisdom (10), Justice (10)
- **Marie Curie**: Science (10), Women's Rights (10), Evidence (9)
- **Sun Tzu**: Strategy (10), Warfare (10), Preparation (10)
- **Einstein**: Science ethics (10), Peace (10), Nuclear weapons (10)
- **Gandhi**: Non-violence (10), Truth (10), Independence (10)

## SCALING GUIDE FOR REMAINING 45 CHARACTERS

**EXACT BLUEPRINT TO IMPLEMENT FOR EACH CHARACTER:**

### Step 1: Core Beliefs System
Add this structure after their `style` field:

```javascript
core_beliefs: [
  {
    statement: "[Character's fundamental belief - research historically accurate]",
    conviction: [1-10 based on how strongly they held this],
    triggers: ["keyword1", "keyword2", "topic1", "concept1"],
    context: "[Why they believe this - historical context]"
  },
  // 3-5 core beliefs per character
],
topic_convictions: {
  "topic1": [1-10],
  "topic2": [1-10],
  "concept1": [1-10]
  // 5-10 topics they care about
}
```

### Step 2: Relationship Matrix  
Add this structure after `topic_convictions`:

```javascript
relationships: {
  // Enhanced relationships with pilot characters
  '1': { // Socrates
    sentiment: 'admiring|respectful|neutral|dismissive|hostile',
    intensity: [1-10],
    nickname: '[How they refer to Socrates]',
    reason: '[Why they feel this way - historically based]',
    historical_connection: '[Did they know of each other/influence each other]'
  },
  '2': { // Marie Curie - same structure },
  '3': { // Sun Tzu - same structure },
  '7': { // Einstein - same structure },
  '10': { // Gandhi - same structure },
  // Add relationships with other major characters as appropriate
}
```

### Step 3: Research Guidelines
For each character, research:
1. **3-5 core beliefs** they would NEVER compromise on
2. **Historical accuracy** - what did they actually believe?
3. **Conviction levels** - how strongly did they hold each belief?
4. **Topic triggers** - what keywords would activate responses?
5. **Relationships** - how would they view our 5 pilots?

### Step 4: Conviction Level Guidelines
- **10**: Would die for this belief (like Gandhi's non-violence)
- **9**: Core to their identity and life's work
- **8**: Very important, would argue strongly
- **7**: Important but might compromise in extreme circumstances
- **6**: Moderate conviction
- **1-5**: Less important beliefs

### Step 5: Relationship Sentiment Guidelines
- **Admiring (8-10)**: Deep respect, inspiration
- **Respectful (6-7)**: Professional/intellectual respect  
- **Neutral (4-5)**: Aware but no strong opinion
- **Dismissive (2-3)**: Disapproval, disagreement
- **Hostile (1)**: Fundamental opposition

### Step 6: Historical Research Priority
1. **What were their core principles?** (non-negotiable beliefs)
2. **What topics triggered strong reactions?** (conviction triggers)
3. **How would they view each pilot character?** (relationship dynamics)
4. **What nicknames would they use?** (based on their era/style)

**EXAMPLES FROM PILOTS:**
- Gandhi calls Sun Tzu "The Violence Advocate" (hostile)
- Einstein calls Gandhi "The Mahatma" (admiring)  
- Socrates calls Einstein "The Universe Questioner" (admiring)
- Sun Tzu calls Gandhi "The Naive Pacifist" (hostile)

**LATEST SYSTEM UPDATES (Current Session):**
- [COMPLETED] Fixed relationship context passing bug - now all panelists aware of each other from start
- [COMPLETED] Enhanced system prompts to explicitly require nickname usage and sentiment display
- [ISSUE] Relationships still not showing in conversation - needs debugging
- [COMPLETED] UI background now properly grey

**MOBILE APP ROLLOUT STRATEGY:**

### Phase 1: Web Perfection (Current)
- Perfect 50 characters with full conviction/relationship systems
- Stable web platform with proven engagement
- Comprehensive testing of all features

### Phase 2: Mobile MVP (Next 3-6 months) 
- **React Native** implementation (80-90% code reuse from web)
- **Expo** for rapid deployment and updates
- **Core Features**: Character selection, conversations, conviction responses
- **50 Characters**: Same depth as web platform
- **Age Rating**: 12+ (educational content with historical conflicts)

### Phase 3: Enhanced Mobile (6-12 months)
- **Offline Mode**: Character bios and basic info work without internet
- **Push Notifications**: "Einstein wants to join your conversation about science"
- **Voice Integration**: Audio conversations for mobile-first experience
- **Favorites System**: Users save preferred character combinations

### Phase 4: Expansion (Year 2)
- **Add 50 More Characters** (100 total) - carefully curated major figures
- **Advanced Search**: Filter by era, profession, conviction topics
- **Social Features**: Share interesting conversations
- **Premium Tiers**: Advanced character combinations, longer conversations

### Phase 5: Platform Maturity (Year 3+)
- **150-200 Characters Maximum** (quality over quantity)
- **Cross-Platform Sync**: Web ↔ Mobile conversation history
- **Educational Partnerships**: School/university integrations
- **API Access**: Allow developers to build on the platform

**SCALING DECISION MATRIX:**
- ✅ **50-100 Characters**: Manageable, high quality
- ⚠️ **100-200 Characters**: Challenging but feasible
- ❌ **500+ Characters**: Maintenance nightmare, diminishing returns

**MOBILE TECHNICAL CONSIDERATIONS:**
- **Bundle Size**: 50 characters = ~5-10MB, acceptable
- **Memory Usage**: Relationship matrices need efficient caching
- **API Costs**: Conviction checking for 50 characters per message = manageable
- **Performance**: Good loading states essential for AI response times

**DEPLOYMENT COMMANDS:**
```powershell
# Backend
cd "C:\Users\Oreko\work\theroundtable\theroundtable-backend"
npm run build:lambda
cd dist
del lambda.zip
Compress-Archive -Path * -DestinationPath lambda.zip -Force
aws lambda update-function-code --function-name theroundtable-backend-dev --zip-file fileb://lambda.zip

# Frontend  
cd "C:\Users\Oreko\work\theroundtable\theroundtable-frontend"
npm run deploy
```

## Project Goals & Timeline - UPDATED CAREER FOCUS

**Current Project Status**: TheRoundTable is now a **PORTFOLIO PIECE** for DevOps-to-MLOps career transition.

**IMMEDIATE GOALS (Next 2 weeks)**:
- Secure production deployment with proper secrets management
- Complete basic security hardening 
- Deploy as polished portfolio demonstration
- Document architecture and technical decisions

**CAREER TRANSITION PRIORITY**:
- **Primary Focus (80%)**: Building MLOps betting market predictor ("better" repo)
- **Secondary Focus (20%)**: Finishing this app as portfolio piece
- **Timeline**: 3-6 months to land $300k MLOps role
- **Current Situation**: $360k across 3 DevOps jobs → Target $420k (keep 1 favorite + 1 new MLOps)

**Portfolio Success Metrics**:
- Demonstrates full-stack + AWS deployment capabilities
- Shows conversation AI integration skills
- Proves production-ready development practices
- Complements MLOps learning project

**NO LONGER PURSUING**:
- ❌ Commercial release or monetization
- ❌ Mobile app development
- ❌ Marketing or user acquisition
- ❌ Business incorporation or legal setup