# Critical Alerts Flow Understanding

Critical Alerts in the post-treatment feature act as a safety net after a
patient leaves the clinic. A doctor first creates a follow-up plan with
scheduled WhatsApp check-ins. On each planned day, MediFlow sends a mocked
check-in message and stores it in the message log. When the patient replies,
the reply is also stored in the same conversation thread.

Every inbound reply is immediately scanned for danger words such as severe,
chest pain, cannot breathe, bleeding, faint, urgent, or help me. If no risk
words are found, the reply simply marks that check-in as answered. If a risky
phrase is found, MediFlow marks that message as critical and creates a Critical
Alert.

That alert appears in the Critical Alerts queue and also increases the sidebar
badge count. Staff can quickly see the patient name, phone number, condition,
reply reason, and related plan. Pending alerts always stay at the top so they
are not missed.

The doctor or admin must call the patient, then mark the alert as called,
which changes it to acknowledged. After the situation is handled, they add
resolution notes and mark it resolved. The alert stays saved as history for
future review.
