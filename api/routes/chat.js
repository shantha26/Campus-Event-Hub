const express = require('express');
const router  = express.Router();

// Simple rule-based chat endpoint (extend with AI if needed)
router.post('/ask', (req, res) => {
  const { message = '', role = '' } = req.body;
  const lower = message.toLowerCase();

  let reply = "I'm not sure about that. Please check your dashboard for more information.";

  if (lower.includes('event') || lower.includes('fest') || lower.includes('hackathon')) {
    reply = "You can browse all events from your dashboard's 'All Events' section. Use filters to find events by type, status, or date.";
  } else if (lower.includes('register')) {
    reply = "To register for an event, browse events and click 'Register'. Your registration will be reviewed by the event organizer.";
  } else if (lower.includes('notification')) {
    reply = "Check the notification bell (🔔) in your navbar to see all your notifications including registration status updates.";
  } else if (lower.includes('approved') || lower.includes('rejected') || lower.includes('status')) {
    reply = "You can track your registration status in 'My Registrations' section of your dashboard. You'll also receive notifications when your status changes.";
  } else if (lower.includes('create') && role.includes('admin')) {
    reply = "As an admin, click '+ Create Event' in your dashboard to create a new event. Fill in all details including title, date, venue and capacity.";
  } else if (lower.includes('approve') && role.includes('admin')) {
    reply = "Go to your event's Registrations view (click the participants icon) to approve or reject student registrations.";
  }

  res.json({ reply });
});

module.exports = router;
