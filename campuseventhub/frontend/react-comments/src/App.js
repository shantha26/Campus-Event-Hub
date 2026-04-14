import React from 'react';
import CommentSection from './CommentSection';

/**
 * App.js – Demo wrapper
 *
 * Change DEMO_EVENT_ID to a real MongoDB event _id from your database,
 * or use it as-is to test the component with a mock/placeholder event.
 */

// 👇 Replace with a real event _id from your MongoDB `events` collection
const DEMO_EVENT_ID   = '000000000000000000000001';
const DEMO_TITLE      = 'Tech Fest 2025 – Hackathon';
const DEMO_DESC       = 'A 24-hour hackathon bringing together the brightest student minds to solve real-world problems using cutting-edge technology.';

function App() {
  return (
    <CommentSection
      eventId={DEMO_EVENT_ID}
      eventTitle={DEMO_TITLE}
      eventDescription={DEMO_DESC}
    />
  );
}

export default App;
