Orchestrator testingn:

### 1. 👌 MessagingSkill.sendMessage: Send a chat message to a specific user or channel in the provider (e.g. Slack).
> send a message to "bug-fixing" channel with all you know about "Aian project"
### 2. 👌 EmailSkill.sendBrandedEmail: Send an email wrapped in the company branding template.
> Send me an email at amyralsyd367@gmail.com with all of my pending meetings and all of my "to do" tasks in the "Aian" board
### 3. 👌 KnowledgeSkill.answerQuestion: Answer a question using the organizational knowledge graph.
> Who was responsible for integrating with the GitHub provider in the Aian project? And what skills did he add to this provider?
### 4. KnowledgeSkill.summarize: Summarize a topic using the organizational knowledge graph, with an optional scope constraint.
> Summarize to me the process of implementing the knowledge pipeline
### 5. 👌 meetingSkill.createMeeting: Schedule or create a Zoom meeting and add registrants by email.
> Schedule a meeting next Monday at 10:00 AM to deploy the Aian project to production. Invite both me and my teammate. Here are our emails: amiralsayed.work@gmail.com, amyralsyd367@gmail.com,
### 6. 👌 meetingSkill.updateMeeting: Update/modify an existing Zoom meeting.
> Yes, please update the "Deploy Aian project to production" meeting to be 120 minutes instead of 60 and send a reminder to the "new-features" channel with the update.
### 7. 👌 meetingSkill.listMeetings: List Zoom meetings.
> List all the upcoming meetings for me, please.
### 8. 👌 meetingSkill.cancelMeetings: Cancel/remove/delete a Zoom meeting.
> Cancel the Planning Sync meeting for me, please.
### 9. 👌 meetingSkill.inviteToMeetings: Invite people to a Zoom meeting or add registrants.
> Please invite amiralsayed.iti@gmail.com to the Deploy Aian project to production meeting
### 10. 👌 meetingSkill.getMeetingDetails: Get meeting details.
> Please list the details of the "Deploy Aian project to production" meeting.
### 11. Trello.createTask: Create a new Trello card.
> Please create a task for me on the "Aian" Board at "To Do" list to add the latest updates to the production environment, assign it to me, and make it a high priority. The due date is tomorrow.
### 12. Trello.updateTask: Update an existing Trello card.
> Update the "final test for all the skills" task description, and add all you know about the "Aian project" to its description.
### 13. Trello.assignTask: Assign a Trello card to a user.
> Assign the "final test for all the skills" task to me, please.
### 14. Trello.moveTask: Move a Trello card to a different list.
> Move all of my assigned tasks in the "to do" list in the "Aian" Board to the "In Progress" list, please.
### 15. Trello.commentTask: Add a comment to a Trello card.
> Add a new comment to the "final test for all the skills" ticket in the "Aian" board, with the summarization of the knowledge processor pipeline.
### 16. Trello.deleteTask: Delete a Trello card.
> Delete the "final test for all the skills" ticket from the "Aian" board, please.
### 17. Trello.listTasks: List Trello cards with optional filtering.
> Please list all of my tickets in the "Aian" board, in the "In Progress" list.
### 18. Trello.getTask: Get details of a specific Trello card.
> Show me all the "Change all aian images form all providers and integrations" ticket details.
### 19. ReportingSkill.generateReport: Generate structured markdown reports (Daily, Weekly, Performance, or Planning) by aggregating Jira or Trello >
tasks, Zoom meetings, and cross-platform Knowledge Graph context.
>