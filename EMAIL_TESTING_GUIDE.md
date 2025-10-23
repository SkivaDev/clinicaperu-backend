# 📧 Email Queue Testing Guide - HU-019

## Quick Start

### 1. Update .env
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP Configuration (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@clinicaperu.com
```

### 2. Start Services
```bash
# Ensure Docker is running
docker-compose up -d

# Start NestJS app
pnpm run start:dev
```

### 3. Access Dashboards
- **MailHog UI:** http://localhost:8025
- **Bull Board:** http://localhost:3001/admin/queues
- **API Docs:** http://localhost:3001/api

---

## 🧪 Test Commands

### Test 1: Booking Confirmation
```bash
curl -X POST http://localhost:3000/email-test/send \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"patient@test.com\",\"template\":\"BOOKING_CONFIRMATION\",\"variables\":{\"patientName\":\"Juan Pérez\",\"doctorName\":\"Dra. María García\",\"specialty\":\"Cardiología\",\"date\":\"25 de Octubre, 2025\",\"time\":\"10:00 AM\",\"location\":\"Clínica Principal, Consultorio 101\"}}"
```

### Test 2: Booking Cancellation
```bash
curl -X POST http://localhost:3000/email-test/send \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"patient2@test.com\",\"template\":\"BOOKING_CANCELLATION\",\"variables\":{\"patientName\":\"María López\",\"doctorName\":\"Dr. Carlos Ruiz\",\"date\":\"26 de Octubre, 2025\",\"time\":\"14:30 PM\"}}"
```

### Test 3: Booking Reminder
```bash
curl -X POST http://localhost:3000/email-test/send \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"patient3@test.com\",\"template\":\"BOOKING_REMINDER\",\"variables\":{\"patientName\":\"Pedro Sánchez\",\"doctorName\":\"Dra. Ana Torres\",\"time\":\"09:00 AM\",\"location\":\"Clínica Norte, Consultorio 205\"}}"
```

### Test 4: Check Email Status
```bash
# Replace {emailId} with actual ID from previous response
curl http://localhost:3001/email-test/status/{emailId}
```

### Test 5: Test Retry Logic (Invalid Email)
```bash
curl -X POST http://localhost:3000/email-test/send \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"invalid-email\",\"template\":\"BOOKING_CONFIRMATION\",\"variables\":{\"patientName\":\"Test\",\"doctorName\":\"Test\",\"specialty\":\"Test\",\"date\":\"Test\",\"time\":\"Test\",\"location\":\"Test\"}}"
```

---

## ✅ Expected Results

### Successful Email
- Response includes `emailId`
- Email appears in MailHog within 5 seconds
- Database status: `SENT`
- Bull Board shows completed job
- Log: `✅ Email sent: {template} to {to}`

### Failed Email (after 3 retries)
- Takes ~40 seconds (exponential backoff: 0s, 3s, 9s, 27s)
- Database status: `FAILED`
- `attempts: 3`
- `lastError` populated
- Log: `❌ Email failed after 3 attempts`

---

## 🔍 Verification

### Check Database
```sql
SELECT id, to, status, attempts, template, "sentAt" 
FROM "EmailMessage" 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Check Docker Services
```bash
docker ps
```
Should show:
- `clinicaperu-redis` (port 6379)
- `clinicaperu-mailhog` (ports 1025, 8025)

### Check Logs
```bash
# Look for these messages:
# ✅ Email service initialized with SMTP configuration
# 📧 Email enqueued: {template} to {to}
# ✅ Email sent: {template} to {to}
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis connection error | `docker-compose up -d redis` |
| SMTP timeout | `docker-compose up -d mailhog` |
| Module not found | Restart IDE/TypeScript server |
| Jobs stuck | Restart app, check Redis |

---

## 📊 Architecture

```
API → EmailService → Redis (BullMQ) → EmailProcessor → MailHog
                ↓
            Database (EmailMessage)
```

**Queue Configuration:**
- Max attempts: 3
- Backoff: Exponential (3s base)
- Rate limit: 100 emails/min
- Auto-cleanup: 100 completed, 500 failed

**Templates Available:**
1. BOOKING_CONFIRMATION
2. BOOKING_CANCELLATION
3. BOOKING_REMINDER
4. PASSWORD_RESET
5. WELCOME

---

## 🎯 Production Deployment

For production, update `.env`:
```bash
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@clinicaperu.com
```

All other code remains unchanged - production ready! ✅
