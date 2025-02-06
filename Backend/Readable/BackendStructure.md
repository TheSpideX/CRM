## **Backend Structure for Technical Support CRM Portal**

This backend structure will support all **MVP** features, **excluding future implementations** like AI-based routing, advanced analytics, and third-party integrations.

---

## **1. Folder Structure**

```
/backend
│── /config
│   ├── db.js                 # Database connection
│   ├── logger.js             # Logging setup
│── /controllers
│   ├── authController.js      # Authentication & Authorization
│   ├── userController.js      # User & Role management
│   ├── ticketController.js    # Ticket lifecycle (CRUD, assignment, SLA enforcement)
│   ├── teamController.js      # Team management (creation, members, workload monitoring)
│   ├── commentController.js   # Internal comments and change tracking
│   ├── notificationController.js # Notifications for SLA breaches, new assignments, mentions
│   ├── chatController.js      # Internal chat messages between team members
│── /middlewares
│   ├── authMiddleware.js      # Protect routes & manage roles
│   ├── errorMiddleware.js     # Global error handling
│── /models
│   ├── User.js                # User model (Admin, Team Lead, Support, Technical)
│   ├── Ticket.js              # Ticket model with status, priority, SLA tracking
│   ├── Team.js                # Team model (Team Leads, Members, dynamic teams)
│   ├── Comment.js             # Comments tracking ticket updates
│   ├── Notification.js        # Real-time notifications schema
│   ├── Chat.js                # Internal chat schema for real-time discussions
│── /routes
│   ├── authRoutes.js          # Login, Register, JWT handling
│   ├── userRoutes.js          # User CRUD & Role management
│   ├── ticketRoutes.js        # Ticket operations & workflows
│   ├── teamRoutes.js          # Team creation & member management
│   ├── commentRoutes.js       # Comment system for tickets
│   ├── notificationRoutes.js  # Fetching user notifications
│   ├── chatRoutes.js          # Internal chat endpoints
│── /services
│   ├── emailService.js        # Email alerts for SLA breaches & ticket updates
│   ├── notificationService.js # Real-time notifications
│── /utils
│   ├── socket.js              # WebSockets setup for real-time features
│   ├── constants.js           # Statuses, priorities, role-based permissions
│── /tests
│   ├── ticket.test.js         # Unit tests for ticket functionality
│   ├── auth.test.js           # Authentication tests
│── server.js                  # Main Express server setup
│── package.json               # Dependencies
│── .env                       # Environment variables (DB_URI, JWT_SECRET)
│── .gitignore                  # Ignore sensitive files
```

---

## **2. File Responsibilities**

### **Core System**

| File                               | Responsibilities                                                      |
| ---------------------------------- | --------------------------------------------------------------------- |
| **server.js**                      | Main entry point, initializes Express, connects to DB, starts server. |
| **config/db.js**                   | Connects to MongoDB using Mongoose.                                   |
| **middlewares/authMiddleware.js**  | Ensures authentication, restricts access based on roles.              |
| **middlewares/errorMiddleware.js** | Global error handling middleware.                                     |

### **User & Authentication**

| File                              | Responsibilities                                     |
| --------------------------------- | ---------------------------------------------------- |
| **models/User.js**                | Defines user schema (name, email, role, team).       |
| **controllers/authController.js** | Handles login, JWT authentication, password hashing. |
| **controllers/userController.js** | Manages user roles, team assignments.                |
| **routes/authRoutes.js**          | Login, logout, token refresh, register.              |
| **routes/userRoutes.js**          | CRUD operations for users, role changes.             |

### **Ticket Management**

| File                                | Responsibilities                                            |
| ----------------------------------- | ----------------------------------------------------------- |
| **models/Ticket.js**                | Stores ticket data (status, priority, SLA, assigned team).  |
| **controllers/ticketController.js** | CRUD operations, assignments, SLA enforcement, escalations. |
| **routes/ticketRoutes.js**          | Handles all ticket-related API endpoints.                   |

### **Team Management**

| File                              | Responsibilities                                                    |
| --------------------------------- | ------------------------------------------------------------------- |
| **models/Team.js**                | Defines team schema, stores lead/member relations.                  |
| **controllers/teamController.js** | Allows team creation, member addition/removal, workload monitoring. |
| **routes/teamRoutes.js**          | Manages API routes for team operations.                             |

### **Internal Comments & Logs**

| File                                 | Responsibilities                                            |
| ------------------------------------ | ----------------------------------------------------------- |
| **models/Comment.js**                | Tracks all changes and discussions within a ticket.         |
| **controllers/commentController.js** | Handles CRUD for ticket comments, maintains an audit trail. |
| **routes/commentRoutes.js**          | API routes for adding/retrieving ticket comments.           |

### **Notifications System**

| File                                      | Responsibilities                                                     |
| ----------------------------------------- | -------------------------------------------------------------------- |
| **models/Notification.js**                | Stores user notifications (SLA breaches, new assignments, mentions). |
| **controllers/notificationController.js** | Triggers real-time notifications when changes occur.                 |
| **routes/notificationRoutes.js**          | API routes to fetch user notifications.                              |
| **services/notificationService.js**       | Sends real-time updates using WebSockets.                            |

### **Internal Chat System**

| File                              | Responsibilities                                      |
| --------------------------------- | ----------------------------------------------------- |
| **models/Chat.js**                | Stores team messages with timestamps.                 |
| **controllers/chatController.js** | Manages chat creation, message storage, live updates. |
| **routes/chatRoutes.js**          | API endpoints for team messaging.                     |

### **Utility Services**

| File                         | Responsibilities                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **services/emailService.js** | Sends SLA breach alerts & ticket updates via email.                              |
| **utils/socket.js**          | Sets up WebSockets for real-time updates (comments, assignments, chats).         |
| **utils/constants.js**       | Stores fixed system values (ticket statuses, priority levels, role permissions). |

---

## **3. Feature Mapping to Files**

| Feature                                                 | Responsible Files                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| **User Authentication (JWT-based)**                     | `authController.js`, `authRoutes.js`, `authMiddleware.js`         |
| **Role-based Access Control (RBAC)**                    | `authMiddleware.js`, `userController.js`                          |
| **Ticket Lifecycle Management**                         | `ticketController.js`, `ticketRoutes.js`, `Ticket.js`             |
| **Kanban Board (Backend Support)**                      | `ticketController.js` (to fetch tickets in different statuses)    |
| **SLA-driven Deadlines**                                | `ticketController.js` (auto-escalation logic)                     |
| **Multi-team Ticket Sharing**                           | `ticketController.js`, `teamController.js`                        |
| **Live Chat for Internal Teams**                        | `chatController.js`, `chatRoutes.js`, `socket.js`                 |
| **Internal Ticket Comments**                            | `commentController.js`, `commentRoutes.js`, `Comment.js`          |
| **Real-time Notifications**                             | `notificationController.js`, `notificationRoutes.js`, `socket.js` |
| **Dynamic Team Management**                             | `teamController.js`, `teamRoutes.js`, `Team.js`                   |
| **Advanced Search & Filtering**                         | `ticketController.js` (querying with filters)                     |
| **Audit Logs & Change History**                         | `commentController.js`, `Comment.js`                              |
| **Performance Monitoring (Basic Logging)**              | `logger.js`, `errorMiddleware.js`                                 |
| **Drag & Drop Ticket Prioritization (Backend Support)** | `ticketController.js` (ordering logic)                            |

---

## **4. API Overview**

| Method | Endpoint                    | Purpose                                       |
| ------ | --------------------------- | --------------------------------------------- |
| `POST` | `/api/auth/login`           | User login                                    |
| `POST` | `/api/auth/register`        | New user registration                         |
| `GET`  | `/api/users`                | Get all users                                 |
| `POST` | `/api/tickets`              | Create a new ticket                           |
| `PUT`  | `/api/tickets/:id`          | Update a ticket (assign, change status, etc.) |
| `GET`  | `/api/tickets`              | Get all tickets (with filters)                |
| `GET`  | `/api/tickets/:id/comments` | Get comments for a ticket                     |
| `POST` | `/api/tickets/:id/comments` | Add a comment to a ticket                     |
| `POST` | `/api/teams`                | Create a new team                             |
| `POST` | `/api/teams/:id/members`    | Add a member to a team                        |
| `GET`  | `/api/notifications`        | Fetch user notifications                      |
| `POST` | `/api/chat`                 | Send a message in team chat                   |

---

## **✅ Core Features from BRD (MVP)**

| Feature                                                                                     | Implemented In                                                                         |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Role-based UI (Customers, Support, Technical Team, Team Leads, Admins)**                  | `authMiddleware.js`, `User.js`, `authController.js`, `userController.js`               |
| **Basic Ticket Lifecycle (Create, Assign, Update, Resolve, Close)**                         | `ticketController.js`, `ticketRoutes.js`, `Ticket.js`                                  |
| **Kanban Board (Backend Support)**                                                          | `ticketController.js` (fetch tickets by status)                                        |
| **SLA-driven Deadlines with Alerts**                                                        | `ticketController.js` (automated escalation)                                           |
| **Dynamic Team Management (Create, Add/Remove Members)**                                    | `teamController.js`, `Team.js`, `teamRoutes.js`                                        |
| **Multi-team Ticket Sharing**                                                               | `ticketController.js`, `teamController.js`                                             |
| **Live Chat for Internal Teams**                                                            | `chatController.js`, `socket.js`                                                       |
| **Automated Priority Escalation (based on backlog/ticket age)**                             | `ticketController.js` (auto-escalation logic)                                          |
| **Ticket Reassignment by Team Leads**                                                       | `ticketController.js`                                                                  |
| **Member Dashboard (Individual Work Tracking)**                                             | `ticketController.js`, `commentController.js` (fetch assigned tickets & activity logs) |
| **Team Lead Dashboard (Team Performance Monitoring)**                                       | `ticketController.js` (team-wide ticket analytics)                                     |
| **Internal Ticket Comments (Chronological Log of Updates)**                                 | `commentController.js`, `Comment.js`, `commentRoutes.js`                               |
| **Custom Ticket Statuses & Workflows**                                                      | `ticketController.js` (custom statuses in DB), `constants.js`                          |
| **Advanced Filtering & Search (SLA Breach, Priority, Unresolved Blockers, Shared Tickets)** | `ticketController.js` (query filtering)                                                |
| **Audit Logs & Change History**                                                             | `commentController.js`, `Comment.js` (tracking ticket modifications)                   |
| **Real-time Notifications (Ticket Updates, Assignments, SLA Breaches, Mentions)**           | `notificationController.js`, `notificationRoutes.js`, `socket.js`                      |

---

## **✅ Additional Functional Requirements Covered**

| Feature                                                                     | Implemented In                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Chronological Ordered Ticket Comments**                                   | `commentController.js`, `Comment.js`, `commentRoutes.js`            |
| **Threaded Comments in Tickets**                                            | `commentController.js`, `Comment.js`                                |
| **In-app Messaging for Team Members**                                       | `chatController.js`, `socket.js`                                    |
| **Tagging & Mentions in Comments**                                          | `commentController.js` (detects @mentions & triggers notifications) |
| **Notification Alerts for New Assignments, SLA Breaches, Comments**         | `notificationController.js`, `notificationRoutes.js`, `socket.js`   |
| **Dark Mode Support (Frontend - API unaffected)**                           | Not needed in backend                                               |
| **Drag & Drop Ticket Prioritization (Backend Support)**                     | `ticketController.js` (updates ticket order)                        |
| **Quick Action Shortcuts (Handled in Frontend, API Supports Fast Updates)** | Not needed in backend                                               |
| **Dynamic Workload Distribution (Auto-assign Tickets Based on Workload)**   | `ticketController.js` (calculates least loaded team member)         |
| **Integration with Calendar & Scheduling (Google Calendar, Outlook)**       | `notificationService.js` (can be extended later)                    |

---

## **⏳ Excluded (Future Enhancements)**

| Feature                                                                 | Status                          |
| ----------------------------------------------------------------------- | ------------------------------- |
| **Third-Party Integrations (GitHub, Slack)**                            | ❌ Not included in this version |
| **AI-based Smart Ticket Assignment**                                    | ❌ Future feature               |
| **Advanced Analytics & Predictive Insights**                            | ❌ Future feature               |
| **Custom SLA Configurations per Ticket Type**                           | ❌ Future feature               |
| **Public Knowledge Base for Self-service**                              | ❌ Future feature               |
| **Recurring Tickets & Scheduled Reports**                               | ❌ Future feature               |
| **Performance Monitoring Dashboard (API Load, System Health Tracking)** | ❌ Future feature               |
| **Incident & Problem Management Module**                                | ❌ Future feature               |
| **Automated Response Suggestions (AI-powered Chatbot)**                 | ❌ Future feature               |
| **Customer Satisfaction Tracking & Surveys**                            | ❌ Future feature               |

---