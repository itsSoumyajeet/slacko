# Slack Connect

A modern web application that enables users to connect their Slack workspace, send messages immediately, and schedule messages for future delivery.

## Table of Contents

*   [ Features](#-features)
*   [ Technology Stack](#️-technology-stack)
*   [ Architectural Overview](#️-architectural-overview)
    *   [Overall Architecture](#overall-architecture)
    *   [Database Schema](#database-schema)
    *   [OAuth 2.0 Flow](#oauth-20-flow)
    *   [Token Management](#token-management)
    *   [Scheduled Message System](#scheduled-message-system)
    *   [Real-time Communication (Socket.IO)](#real-time-communication-socketio)
    *   [Frontend Structure](#frontend-structure)
*   [API Endpoints](#api-endpoints)
*   [ Prerequisites](#-prerequisites)
*   [ Setup Instructions](#-setup-instructions)
    *   [1. Clone the Repository](#1-clone-the-repository)
    *   [2. Install Dependencies](#2-install-dependencies)
    *   [3. Configure Slack App](#3-configure-slack-app)
    *   [4. Environment Configuration](#4-environment-configuration)
    *   [5. Initialize Database](#5-initialize-database)
    *   [6. Start Development Server](#6-start-development-server)
    *   [7. Start the Scheduler (for production)](#7-start-the-scheduler-for-production)
*   [ Testing the Application](#-testing-the-application)
*   [ Deployment](#-deployment)
*   [ Challenges & Learnings](#-challenges--learnings)
*   [ Future Enhancements](#-future-enhancements)
*   [ License](#-license)
*   [ Contributing](#-contributing)
*   [ Support](#-support)

##  Features

-   **Secure Slack Connection**: OAuth 2.0 integration for secure workspace authentication, ensuring your Slack data remains protected.
-   **Proactive Token Management**: Automatic token refresh mechanism that renews access tokens before they expire, providing continuous service without re-authentication.
-   **Immediate Messaging**: Send messages instantly to any public or private Slack channel, or direct message.
-   **Scheduled Messaging**: Schedule messages for future delivery with precise timing, down to the minute.
-   **Message Management**: View, manage, and cancel scheduled messages directly from the application before their delivery time.
-   **Real-time Status**: Track message delivery status and workspace connection health within the application dashboard.

## 🛠️ Technology Stack

### Frontend
-   **Next.js 15** - A powerful React framework utilizing the App Router for server-side rendering, static site generation, and API routes.
-   **TypeScript** - Provides type safety across the entire codebase, enhancing code quality and developer experience.
-   **Tailwind CSS** - A utility-first CSS framework for rapidly building custom designs directly in your markup.
-   **shadcn/ui** - A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS.
-   **Lucide React** - A consistent and customizable icon library used for various UI elements.

### Backend
-   **Next.js API Routes** - Serverless API endpoints built within the Next.js framework, handling all backend logic and integrations.
-   **TypeScript** - Ensures type-safe backend development, improving reliability and maintainability.
-   **Prisma ORM** - A modern database toolkit that simplifies database access with an intuitive data model and powerful query builder.
-   **Node.js** - The JavaScript runtime environment powering the backend.

### Infrastructure
-   **SQLite** - A lightweight, file-based database used for storing application data such as user information, Slack workspace details, OAuth tokens, and scheduled messages.
-   **OAuth 2.0** - The industry-standard protocol for secure authorization, used for connecting with Slack workspaces.
-   **Cron Scheduler** - A background process (`scheduler.js`) that periodically triggers the message delivery mechanism, ensuring scheduled messages are sent on time.

##  Architectural Overview

### Overall Architecture

Slack Connect is a full-stack Next.js application designed to provide a seamless experience for managing Slack messages. It leverages Next.js's capabilities for both frontend rendering and backend API routes, complemented by a custom Node.js server for real-time communication and a dedicated scheduler for background tasks.

*   **Frontend (Next.js Client Components):** The user interface, built with React and styled with Tailwind CSS and Shadcn UI, allows users to connect Slack workspaces, compose messages, and view/manage scheduled messages. It interacts with the Next.js API routes.
*   **Next.js API Routes:** These serverless functions handle all business logic, including Slack OAuth, token management, channel listing, message sending/scheduling, and workspace management. They interact with the database and the Slack API.
*   **Custom Server (`server.ts`):** A custom Node.js HTTP server runs alongside Next.js, primarily to host a Socket.IO server for potential real-time features. It handles both Next.js requests and Socket.IO traffic.
*   **Scheduler (`scheduler.js`):** A separate Node.js process that acts as a cron job. It periodically (every minute) pings a dedicated Next.js API route (`/api/slack/scheduler`) to trigger the processing of due scheduled messages.
*   **Database (SQLite with Prisma):** A lightweight SQLite database stores all application data, including user information, connected Slack workspaces, OAuth tokens, and scheduled messages. Prisma ORM provides a type-safe and efficient way to interact with the database.
*   **Slack API:** The application communicates directly with the Slack API for OAuth, sending messages, and retrieving channel information.

### Database Schema

The application uses a relational database managed by Prisma ORM. Below are the key models and their relationships:

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  slackWorkspaces SlackWorkspace[]
  scheduledMessages ScheduledMessage[]
}

model SlackWorkspace {
  id           String   @id @default(cuid())
  userId       String
  teamId       String   @unique
  teamName     String
  botUserId    String?
  botAccessToken String?
  scope        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokens         SlackToken[]
  scheduledMessages ScheduledMessage[]
}

model SlackToken {
  id            String   @id @default(cuid())
  workspaceId   String
  accessToken   String
  refreshToken  String
  tokenType     String
  expiresAt     DateTime
  scope         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  workspace SlackWorkspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model ScheduledMessage {
  id           String   @id @default(cuid())
  userId       String
  workspaceId  String
  channelId    String
  message      String
  scheduledFor DateTime
  status       MessageStatus @default(PENDING)
  sentAt       DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace SlackWorkspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

enum MessageStatus {
  PENDING
  SENT
  CANCELLED
  FAILED
}
```

**Model Descriptions:**

*   **`User`**: Represents an application user. In this demo, a simplified user model is used, primarily identified by a unique `id`. It has one-to-many relationships with `SlackWorkspace` and `ScheduledMessage`.
    *   `id`: Unique identifier for the user.
    *   `email`: User's email address (unique).
    *   `name`: User's display name (optional).

*   **`SlackWorkspace`**: Stores information about a Slack workspace connected by a user. This includes details obtained during the OAuth process.
    *   `id`: Unique identifier for the workspace record.
    *   `userId`: Foreign key linking to the `User` who connected this workspace.
    *   `teamId`: The unique ID of the Slack team/workspace.
    *   `teamName`: The name of the Slack team/workspace.
    *   `botUserId`, `botAccessToken`, `scope`: Details about the bot user and its permissions within the workspace.
    *   **Relations**: Belongs to a `User`, and has one-to-many relationships with `SlackToken` and `ScheduledMessage`.

*   **`SlackToken`**: Holds the OAuth tokens (access and refresh) obtained from Slack for a specific workspace. These tokens are crucial for making API calls to Slack.
    *   `id`: Unique identifier for the token record.
    *   `workspaceId`: Foreign key linking to the `SlackWorkspace` this token belongs to.
    *   `accessToken`: The primary token used for API calls.
    *   `refreshToken`: Used to obtain new access tokens when the current one expires.
    *   `tokenType`: Type of token (e.g., 'bot').
    *   `expiresAt`: Timestamp indicating when the `accessToken` expires.
    *   `scope`: The permissions granted to this token.
    *   **Relations**: Belongs to a `SlackWorkspace`.

*   **`ScheduledMessage`**: Represents a message that has been scheduled for future delivery to a Slack channel.
    *   `id`: Unique identifier for the scheduled message.
    *   `userId`: Foreign key linking to the `User` who scheduled the message.
    *   `workspaceId`: Foreign key linking to the `SlackWorkspace` where the message will be sent.
    *   `channelId`: The ID of the Slack channel (or DM) where the message is destined.
    *   `message`: The content of the message.
    *   `scheduledFor`: The exact date and time the message is set to be sent.
    *   `status`: The current status of the message, defined by the `MessageStatus` enum.
    *   `sentAt`: Timestamp when the message was actually sent (null if not yet sent or failed).
    *   **Relations**: Belongs to a `User` and a `SlackWorkspace`.

*   **`MessageStatus` (Enum)**: Defines the possible states of a `ScheduledMessage`.
    *   `PENDING`: The message is waiting to be sent.
    *   `SENT`: The message has been successfully sent to Slack.
    *   `CANCELLED`: The message was cancelled before being sent.
    *   `FAILED`: The message failed to send after an attempt.

### OAuth 2.0 Flow

The application implements a secure OAuth 2.0 flow to connect with Slack workspaces. This process ensures that the application gains necessary permissions without ever handling the user's Slack credentials directly.

1.  **Initiation (`GET /api/slack/auth`):**
    *   The user clicks a "Connect Workspace" button in the frontend.
    *   The frontend redirects to `/api/slack/auth`, passing a `userId` as a query parameter.
    *   This API route constructs a Slack OAuth authorization URL, including the `client_id`, `redirect_uri` (pointing to `/api/slack/callback`), required `scope`s (`chat:write`, `channels:read`, `groups:read`, `im:read`, `mpim:read`), and a unique `state` parameter.
    *   The `state` parameter (containing the `userId` and a random string) is stored in an `httpOnly` cookie for CSRF protection.
    *   The user's browser is then redirected to Slack's authorization page.

2.  **Authorization (Slack):**
    *   On Slack's authorization page, the user reviews the requested permissions and grants access to the application.

3.  **Callback (`GET /api/slack/callback`):**
    *   After authorization, Slack redirects the user's browser back to the `redirect_uri` (`/api/slack/callback`), including an authorization `code` and the `state` parameter.
    *   This API route first performs a critical **state verification** by comparing the received `state` with the one stored in the cookie. If they don't match, the request is rejected to prevent CSRF attacks.
    *   The `userId` is extracted from the validated `state`.
    *   The application then makes a server-to-server `POST` request to Slack's `oauth.v2.access` endpoint, exchanging the authorization `code` for an `access_token`, `refresh_token`, and other workspace/bot information.

4.  **Token and Workspace Storage:**
    *   Upon successful token exchange, the application performs several database operations:
        *   **User:** The `User` record (simplified for this demo) is created or updated using `upsert`.
        *   **SlackWorkspace:** The `SlackWorkspace` details (e.g., `teamId`, `teamName`, `botUserId`) are stored or updated using `upsert`.
        *   **SlackToken:** The `access_token`, `refresh_token`, `expires_at`, and `scope` are securely stored in the `SlackToken` table. The `expires_at` is calculated based on Slack's `expires_in` value.

5.  **Completion:**
    *   The `slack_oauth_state` cookie is cleared.
    *   The user is redirected back to the application's home page, indicating a successful connection.

### Token Management

Effective token management is crucial for maintaining continuous access to the Slack API without requiring users to frequently re-authenticate. The application implements a robust token management strategy:

*   **Secure Storage**: OAuth tokens (access and refresh tokens) are securely stored in the SQLite database (`SlackToken` model) after being obtained through the OAuth callback. They are linked to the respective `SlackWorkspace`.
*   **Proactive Refresh**: Before making any API calls to Slack (e.g., fetching channels, sending messages, processing scheduled messages), the application checks the expiration time of the `accessToken`.
    *   If the token is set to expire within **5 minutes**, an internal `POST` request is made to the `/api/slack/tokens` endpoint.
    *   This endpoint uses the stored `refreshToken` to obtain a new `accessToken` (and potentially a new `refreshToken`) from Slack's `oauth.v2.access` endpoint with `grant_type: 'refresh_token'`.
    *   The database record for the `SlackToken` is then updated with the new token details and `expiresAt` timestamp.
*   **Error Handling**: Failed token refresh attempts are logged, and appropriate error responses are returned to the calling function, allowing for graceful degradation or user notification.
*   **Token Validation**: Each API call to Slack implicitly validates the token status. If a token is invalid or expired and cannot be refreshed, the operation will fail, and the user will be prompted to re-authenticate their workspace.

### Scheduled Message System

The scheduled message system allows users to compose messages and specify a future date and time for their delivery. This system is composed of several interacting components:

1.  **Message Creation (Frontend & `POST /api/slack/messages`):**
    *   Users compose messages in the frontend (`src/app/page.tsx`) and provide a `scheduledFor` timestamp.
    *   A `POST` request is sent to `/api/slack/messages` with the message content, target channel, workspace ID, and the `scheduledFor` time.
    *   This API route validates the input and creates a new `ScheduledMessage` record in the database with a `PENDING` status.

2.  **Scheduler Service (`scheduler.js`):**
    *   This is a standalone Node.js script (`scheduler.js`) designed to run as a background process (e.g., via `node scheduler.js`).
    *   It acts as a simple cron job, executing its core logic every **minute**.
    *   Its primary function is to make an internal `POST` request to the `/api/slack/scheduler` API route.

3.  **Message Processing (`POST /api/slack/scheduler`):**
    *   This Next.js API route (`src/app/api/slack/scheduler/route.ts`) is the heart of the scheduling system.
    *   When triggered by `scheduler.js`, it queries the database for all `ScheduledMessage` records that are `PENDING` and whose `scheduledFor` timestamp is less than or equal to the current time.
    *   For each due message:
        *   It performs a **proactive token refresh** for the associated Slack workspace if the token is nearing expiration.
        *   It then makes a `POST` request to Slack's `chat.postMessage` API to send the message to the specified channel.
        *   Upon successful delivery, the message's status in the database is updated to `SENT`.
        *   If sending fails (e.g., Slack API error, invalid token), the message's status is updated to `FAILED`.
    *   Comprehensive error handling and logging are in place for each message processing attempt.

4.  **Message Management (Frontend & `GET/DELETE /api/slack/messages`):**
    *   The frontend allows users to view all their scheduled messages (`GET /api/slack/messages`).
    *   Users can also cancel `PENDING` messages, which triggers a `DELETE` request to `/api/slack/messages`, updating the message's status to `CANCELLED` in the database.

### Real-time Communication (Socket.IO)

The application is set up with a Socket.IO server to enable real-time, bidirectional communication between the client and the server. This infrastructure is in place for future enhancements and current basic demonstration.

*   **Custom Server (`server.ts`):** A custom Node.js HTTP server is used to host both the Next.js application and the Socket.IO server on the same port (3000). This allows for efficient handling of both standard HTTP requests and WebSocket connections.
*   **Socket.IO Setup (`src/lib/socket.ts`):** This file contains the server-side logic for Socket.IO. Currently, it implements a basic echo server:
    *   Upon client connection, it logs the connection and sends a welcome message.
    *   It listens for a `message` event from the client and echoes the message back to the *same client*.
    *   It logs client disconnections.
*   **Future Potential:** While currently a simple echo, this Socket.IO setup provides the foundation for advanced real-time features, such as:
    *   Live updates on scheduled message status changes.
    *   Real-time notifications for message delivery or failures.
    *   Integration with Slack Webhooks for instant updates on new messages or events in connected workspaces.

### Frontend Structure

The frontend of the application is built with Next.js and React, following the App Router convention. It provides an intuitive dashboard for users to manage their Slack integrations.

*   **Root Layout (`src/app/layout.tsx`):** Defines the global HTML structure, metadata (SEO, Open Graph), and imports global styles. It also includes the `Toaster` component for displaying notifications across the application.
*   **Main Dashboard (`src/app/page.tsx`):** This is the primary client-side component that serves as the application's dashboard. It manages the UI state, handles user interactions, and orchestrates data fetching from the backend API routes.
    *   **Tab-based Navigation:** The dashboard is organized into three main tabs:
        *   **Workspaces:** Displays a list of connected Slack workspaces, their connection status, and summary statistics. Allows users to connect new workspaces or disconnect existing ones.
        *   **Send Message:** Provides a form for composing messages, selecting a target workspace and channel, and choosing between immediate or scheduled delivery.
        *   **Scheduled:** Shows a comprehensive list of all scheduled messages, their current status (Pending, Sent, Cancelled, Failed), and options to cancel pending messages.
    *   **API Interaction:** All data loading and actions (sending messages, connecting/disconnecting workspaces, canceling messages) are handled by making requests to the Next.js API routes.
    *   **Styling:** Utilizes Tailwind CSS for utility-first styling, combined with `shadcn/ui` components for a consistent and accessible design. The application features a distinct "brutalist" design aesthetic.
*   **UI Components (`src/components/ui/`):** A rich set of pre-built, customizable UI components from `shadcn/ui` are used throughout the application, ensuring a consistent look and feel.
*   **Utility Functions (`src/lib/utils.ts`):** Contains helper functions, primarily `cn` for intelligently merging Tailwind CSS classes, which is a common pattern in `shadcn/ui` projects.

## API Endpoints

The application exposes a set of RESTful API endpoints built with Next.js API Routes to handle all backend operations and interactions with the Slack API and the database.

*   **`GET /api/slack/auth`**
    *   **Purpose:** Initiates the Slack OAuth 2.0 authorization flow.
    *   **Parameters:** `userId` (query parameter) - The ID of the user initiating the connection.
    *   **Returns:** A redirect to Slack's authorization page. Sets a `slack_oauth_state` cookie for CSRF protection.

*   **`GET /api/slack/callback`**
    *   **Purpose:** Handles the callback from Slack after a user authorizes the application. Exchanges the authorization code for access tokens and stores workspace/token information.
    *   **Parameters:** `code`, `state`, `error` (query parameters from Slack).
    *   **Returns:** A redirect to the application's home page (`/`) with `success=true` or `error` query parameters. Clears the `slack_oauth_state` cookie.

*   **`POST /api/slack/tokens`**
    *   **Purpose:** Refreshes an expired or soon-to-expire Slack access token using the refresh token.
    *   **Parameters:** `workspaceId` (JSON body) - The ID of the workspace whose token needs refreshing.
    *   **Returns:** JSON object with `message`, `accessToken` (newly refreshed), and `expiresAt`.

*   **`GET /api/slack/tokens`**
    *   **Purpose:** Retrieves details about a stored Slack token (excluding the actual token values for security).
    *   **Parameters:** `workspaceId` (query parameter) - The ID of the workspace whose token details are requested.
    *   **Returns:** JSON object with token metadata (ID, workspace info, expiration, scope, creation date).

*   **`GET /api/slack/workspaces`**
    *   **Purpose:** Lists all Slack workspaces connected by a specific user.
    *   **Parameters:** `userId` (query parameter) - The ID of the user.
    *   **Returns:** JSON array of `SlackWorkspace` objects, including token expiration status and scheduled message counts.

*   **`DELETE /api/slack/workspaces`**
    *   **Purpose:** Disconnects (deletes) a Slack workspace from the application. This action cascades to delete associated tokens and scheduled messages.
    *   **Parameters:** `workspaceId` (query parameter) - The ID of the workspace to delete.
    *   **Returns:** JSON object with a success message.

*   **`GET /api/slack/channels`**
    *   **Purpose:** Retrieves a list of public channels, private channels, and direct messages for a given Slack workspace.
    *   **Parameters:** `workspaceId` (query parameter) - The ID of the workspace.
    *   **Returns:** JSON array of Slack channel objects (filtered and formatted).

*   **`POST /api/slack/messages`**
    *   **Purpose:** Sends an immediate message to Slack or schedules a message for future delivery.
    *   **Parameters:** `workspaceId`, `channelId`, `message` (JSON body). `scheduledFor` (optional, ISO string) - If provided, schedules the message.
    *   **Returns:** JSON object with message ID and status (e.g., `Message sent successfully!` or `Message scheduled successfully!`).

*   **`GET /api/slack/messages`**
    *   **Purpose:** Lists all scheduled messages for a specific user, optionally filtered by workspace.
    *   **Parameters:** `userId` (query parameter). `workspaceId` (optional query parameter).
    *   **Returns:** JSON array of `ScheduledMessage` objects.

*   **`DELETE /api/slack/messages`**
    *   **Purpose:** Cancels a pending scheduled message.
    *   **Parameters:** `messageId` (query parameter) - The ID of the scheduled message to cancel.
    *   **Returns:** JSON object with a success message.

*   **`POST /api/slack/scheduler`**
    *   **Purpose:** Internal endpoint triggered by `scheduler.js` to process and send due scheduled messages.
    *   **Parameters:** None (triggered internally).
    *   **Returns:** JSON object with a message indicating the number of messages processed and their results.

*   **`GET /api/slack/scheduler`**
    *   **Purpose:** Provides status information about the scheduled message system.
    *   **Parameters:** None.
    *   **Returns:** JSON object with counts of pending/due messages, recent activity, and last checked timestamp.

##  Prerequisites

-   Node.js 18+ 
-   npm or yarn
-   Slack App credentials (Client ID and Client Secret)

##  Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd slack-connect
```

### 2. Install Dependencies

Install the necessary Node.js packages:

```bash
npm install
# or yarn install
```

### 3. Configure Slack App

To integrate with Slack, you need to create and configure a Slack application. This is a one-time setup.

#### Create a Slack App:
1.  Go to [Slack API](https://api.slack.com/apps)
2.  Click "Create New App" and choose "From scratch"
3.  Enter an app name (e.g., "Slack Connect") and select your workspace
4.  Click "Create App"

#### Configure OAuth & Permissions:
1.  Navigate to "OAuth & Permissions" in the left sidebar.
2.  Under "Redirect URLs", add the following. **For local development, pay close attention to the `https` requirement.**
    *   **If Slack allows `http://localhost:3000` (less common for production apps):**
        ```
        http://localhost:3000/api/slack/callback
        ```
    *   **If Slack requires `https` for local development (most common):** You will need a tunneling service like `ngrok`.
        *   Start `ngrok` (e.g., `ngrok http 3000`) in a separate terminal *after* your `npm run dev` server is running.
        *   `ngrok` will provide an `https` forwarding URL (e.g., `https://xxxx-xx-xx-xx.ngrok-free.app`).
        *   Use this `ngrok` URL for your Redirect URL:
            ```
            https://xxxx-xx-xx-xx.ngrok-free.app/api/slack/callback
            ```
        *   **Important:** If your `ngrok` URL changes (e.g., after restarting `ngrok`), you **must** update this Redirect URL in Slack and also your `NEXT_PUBLIC_BASE_URL` in `.env`.

3.  Under "Scopes", add the following Bot Token Scopes. These are essential for the application's functionality:
    ```
    chat:write
    channels:read
    groups:read
    im:read
    mpim:read
    ```

4.  Scroll to the top and click "Install App to Workspace".
5.  Copy the **Client ID** and **Client Secret** from the "Basic Information" page. You will need these for the next step.

### 4. Environment Configuration

Create a `.env` file in the root directory of your project (`slack-connect/.env`). Populate it with your Slack App credentials and the base URL for your application. **Ensure `NEXT_PUBLIC_BASE_URL` matches your Slack App's Redirect URL.**

```env
DATABASE_URL=file:./dev.db

# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # Or your ngrok https URL, e.g., https://xxxx-xx-xx-xx.ngrok-free.app
```

### 5. Initialize Database

Generate the Prisma client and push the schema to your SQLite database. This will create the `dev.db` file.

```bash
npx prisma generate
npm run db:push
```

### 6. Start Development Server

Start the Next.js development server. This will make the application accessible locally.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application. If you are using `ngrok`, you will still access the application via `http://localhost:3000`, but the OAuth flow will use the `ngrok` tunnel.

### 7. Start the Scheduler (for production)

For scheduled messages to be processed and sent, the scheduler service needs to be running. In a **separate terminal**, run the scheduler:

```bash
node scheduler.js
```

This process will check for scheduled messages every minute and send them when due by calling the internal `/api/slack/scheduler` endpoint.

## 🧪 Testing the Application

Once the application is set up and running, you can test its core functionalities:

### 1. Connect a Workspace
-   Navigate to the "Workspaces" tab.
-   Click "Connect Workspace".
-   You will be redirected to Slack's authorization page. Authorize the Slack app.
-   Verify that the workspace appears in your connected workspaces list on the dashboard.

### 2. Send an Immediate Message
-   Go to the "Send Message" tab.
-   Select your connected workspace and a channel from the dropdowns.
-   Compose a message in the text area.
-   Click "Send Now".
-   Verify that the message appears immediately in your selected Slack channel.

### 3. Schedule a Message
-   In the "Send Message" tab, select your workspace and channel.
-   Compose a message.
-   Select a future date and time using the "Schedule For" input.
-   Click "Schedule Message".
-   Verify that the message appears in the "Scheduled Messages" tab with a `PENDING` status.
-   To see it sent, ensure `scheduler.js` is running. Wait for the scheduled time, or manually trigger the scheduler by restarting `node scheduler.js` (for testing purposes).

### 4. Cancel a Scheduled Message
-   Go to the "Scheduled Messages" tab.
-   Find a message with `PENDING` status.
-   Click the "Cancel" button next to it.
-   Verify that the message's status changes to `CANCELLED`.

### 5. Disconnect a Workspace
-   Navigate to the "Workspaces" tab.
-   Find a connected workspace.
-   Click the "Disconnect" button next to it.
-   Verify that the workspace is removed from your list, and any associated scheduled messages are also removed.

## 🚀 Deployment

Deploying Slack Connect involves deploying both the Next.js application (frontend and API routes) and ensuring the scheduler service runs continuously.

### Frontend Deployment (Vercel/Netlify/Similar)

Next.js applications are well-suited for deployment on platforms like Vercel or Netlify.

1.  Push your code to a GitHub repository.
2.  Connect your repository to your chosen deployment platform (e.g., Vercel, Netlify).
3.  **Set Environment Variables:** Configure the following environment variables in your deployment platform's settings:
    *   `DATABASE_URL`: Use a production-grade database URL (e.g., PostgreSQL connection string). For SQLite, you might need a persistent volume or a different strategy.
    *   `SLACK_CLIENT_ID`: Your Slack App Client ID.
    *   `SLACK_CLIENT_SECRET`: Your Slack App Client Secret.
    *   `NEXT_PUBLIC_BASE_URL`: Your deployed application's public `https` URL (e.g., `https://your-app-name.vercel.app`). This **must** match the Redirect URL configured in your Slack App.

### Backend Considerations

For a robust production deployment, consider the following:

1.  **Database**: While SQLite is used for local development, it's generally not recommended for production environments due to concurrency and scalability limitations. Migrate to a production-grade database like PostgreSQL, MySQL, or MongoDB.
2.  **Scheduler**: The `scheduler.js` script needs to run continuously in the background. Options include:
    *   **Dedicated Server/VM**: Deploying it on a server or virtual machine where it can run as a persistent process (e.g., using `pm2` or `systemd`).
    *   **Serverless Functions with Cron Triggers**: For serverless environments, you might adapt the scheduler logic to a serverless function triggered by a cron service (e.g., AWS Lambda with CloudWatch Events, Google Cloud Functions with Cloud Scheduler).
    *   **Containerization**: Containerize the scheduler and deploy it to a container orchestration platform (e.g., Kubernetes, Docker Swarm).
3.  **Environment Variables**: Ensure all sensitive environment variables and secrets are securely managed in your production environment.
4.  **Monitoring and Logging**: Implement robust logging and monitoring for both the Next.js application and the scheduler service to track performance, errors, and message delivery status.

##  Challenges & Learnings

### Challenges

1.  **Token Expiration Handling**: Implementing robust token refresh logic that works seamlessly without user intervention, especially considering varying token lifetimes and refresh token behaviors.
2.  **Scheduler Reliability**: Ensuring the scheduler runs reliably and handles edge cases like API failures, network issues, and server restarts to guarantee message delivery.
3.  **OAuth State Management**: Properly handling OAuth state verification to prevent CSRF attacks and ensure the integrity of the authorization flow.
4.  **Error Handling**: Providing meaningful error messages to the user while maintaining security and not exposing sensitive internal details.
5.  **Time Zone Management**: Accurately handling scheduled messages across different time zones, ensuring messages are sent at the intended local time for the user.

### Learnings

1.  **OAuth 2.0 Best Practices**: Gained a deep understanding of OAuth flows, token management strategies, and critical security considerations for third-party integrations.
2.  **Database Design**: Learned effective schema design for relational data with proper foreign key constraints and cascade operations using Prisma.
3.  **API Design**: Experience in creating RESTful APIs with clear responsibilities, proper error handling, and appropriate HTTP status codes.
4.  **Background Processing**: Understood the importance of reliable background task processing for features like message scheduling and how to implement it in a Node.js environment.
5.  **User Experience**: Balanced functionality with intuitive user interface design, focusing on clear feedback and ease of use.
6.  **Security**: Implemented secure token storage and validation practices to protect sensitive user data.

##  Future Enhancements

1.  **User Authentication**: Implement a proper user authentication system (e.g., NextAuth.js) to allow multiple users to manage their own Slack connections and messages securely.
2.  **Message Templates**: Create reusable message templates to streamline the message composition process.
3.  **Bulk Messaging**: Support sending messages to multiple channels or direct messages simultaneously.
4.  **Message Analytics**: Track message delivery and engagement metrics to provide users with insights into their communication.
5.  **Webhook Integration**: Utilize Slack webhooks for real-time updates within the application, such as immediate notification of message delivery status or replies.
6.  **Advanced Scheduling**: Support recurring messages, more complex scheduling rules (e.g., every Monday at 9 AM), and time zone conversion for users.
7.  **Team Management**: Allow multiple users within an organization to manage shared workspaces and scheduled messages.
8.  **Message History**: Store and display a comprehensive history of all sent messages, not just scheduled ones.

##  License

This project is licensed under the MIT License.

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

##  Support

For support or questions, please open an issue in the repository.

---

Built by Soumyajeet Biswal