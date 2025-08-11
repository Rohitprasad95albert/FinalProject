// backend/routes/certificates.js
const express = require('express');
const verifyToken = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');
const { generateCertificate, generateDefaultCertificate } = require('../utils/certificateGenerator');
const router = express.Router();

// Generate and download a certificate for a specific student
router.get('/download/:eventId/:studentId', verifyToken, async (req, res) => {
  const { eventId, studentId } = req.params;

  // Security check: ensure the person requesting is the student or an admin
  if (req.user.id !== studentId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  try {
    const event = await Event.findById(eventId);
    const student = await User.findById(studentId);

    if (!event || !student) {
      return res.status(404).json({ error: 'Event or student not found.' });
    }

    // --- START OF FIX: More accurate date and time comparison ---
    const now = new Date();
    const eventDateTime = new Date(event.date);
    if (event.time) {
        const [hours, minutes] = event.time.split(':');
        eventDateTime.setHours(hours, minutes, 0, 0);
    }

    if (eventDateTime > now) {
        // Now this correctly checks the exact time
        return res.status(400).json({ error: 'Certificate not available until after the event.' });
    }
    // --- END OF FIX ---

    const attendee = event.attendees.find(a => a.userId.equals(studentId));
    if (!attendee || !attendee.isAttended) {
      return res.status(400).json({ error: 'Certificate not available. Attendance was not marked.' });
    }
    
    if (!event.certificateTemplateUrl) {
        return res.status(400).json({ error: 'A certificate template has not been uploaded for this event by the club.' });
    }

    // Generate the certificate PDF from the uploaded template
    const pdfBytes = await generateCertificate(student.name, event.title, event.date, event.certificateTemplateUrl);

    // Send the PDF to the client for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Certificate_${event.title.replace(/\s/g, '_')}.pdf`);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Certificate generation failed:', err);
    res.status(500).json({ error: 'Failed to generate certificate', details: err.message });
  }
});

module.exports = router;