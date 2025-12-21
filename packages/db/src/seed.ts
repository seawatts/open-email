import { subDays, subHours } from 'date-fns';
import { sql } from 'drizzle-orm';

import { db } from './client';
import {
  ApiKeys,
  ApiKeyUsage,
  AuthCodes,
  EmailKeywords,
  EmailMessages,
  EmailThreads,
  GmailAccounts,
  OrgMembers,
  Orgs,
  Users,
} from './schema';

// ============================================================================
// Constants
// ============================================================================

const userId = 'user_30oVYOGDYUTdXqB6HImz3XbRyTs';
const orgId = 'org_30oVYhhebEP3q4dSFlxo8DyAxhr';
const orgName = 'seawatts';
const apiKeyId = 'ak_seawatts';
const stripeCustomerId = 'cus_Snv28tYxHudPzx';
const stripeSubscriptionId = 'sub_1RsJCH4hM6DbRRtOGcENjqIO';
const userEmail = 'chris.watts.t@gmail.com';

// Gmail Account
const gmailAccountId = 'gmail_seed_account';

// Thread IDs
const flightThreadId = 'thread_flight_nyc';
const hotelThreadId = 'thread_hotel_plaza';
const amazonThreadId = 'thread_amazon_macbook';
const bankThreadId = 'thread_chase_statement';
const meetingThreadId = 'thread_meeting_q1';
const newsletterThreadId = 'thread_newsletter_tech';

// ============================================================================
// Reset all tables
// ============================================================================

console.log('🗑️  Resetting tables...');

await db.delete(EmailKeywords);
await db.delete(EmailMessages);
await db.delete(EmailThreads);
await db.delete(GmailAccounts);
await db.delete(ApiKeyUsage);
await db.delete(ApiKeys);
await db.delete(OrgMembers);
await db.delete(AuthCodes);
await db.delete(Orgs);
await db.delete(Users);

// ============================================================================
// Seed Users
// ============================================================================

console.log('👤 Seeding users...');

await db.insert(Users).values({
  clerkId: userId,
  email: userEmail,
  firstName: 'Chris',
  id: userId,
  lastName: 'Watts',
  online: true,
});

// ============================================================================
// Seed Orgs
// ============================================================================

console.log('🏢 Seeding orgs...');

await db.insert(Orgs).values({
  clerkOrgId: orgId,
  createdByUserId: userId,
  id: orgId,
  name: orgName,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeSubscriptionStatus: 'active',
});

await db.insert(OrgMembers).values({
  orgId,
  role: 'admin',
  userId,
});

// ============================================================================
// Seed API Keys
// ============================================================================

console.log('🔑 Seeding API keys...');

await db.insert(ApiKeys).values({
  id: apiKeyId,
  key: 'usk-live-300nYp2JItCuoiHhaioQv82QHwo',
  name: 'Default API Key',
  orgId,
  userId,
});

// Seed some API key usage
for (let i = 0; i < 10; i++) {
  await db.insert(ApiKeyUsage).values({
    apiKeyId,
    createdAt: subDays(new Date(), Math.floor(Math.random() * 5)),
    metadata: {},
    orgId,
    type: 'mcp-server',
    userId,
  });
}

// ============================================================================
// Seed Gmail Account
// ============================================================================

console.log('📧 Seeding Gmail account...');

await db.insert(GmailAccounts).values({
  accessToken: 'mock_access_token_encrypted',
  email: userEmail,
  id: gmailAccountId,
  lastHistoryId: '12345',
  lastSyncAt: new Date(),
  refreshToken: 'mock_refresh_token_encrypted',
  tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
  userId,
});

// ============================================================================
// Seed Email Threads
// ============================================================================

console.log('📬 Seeding email threads...');

// Flight confirmation
await db.insert(EmailThreads).values({
  aiSummary:
    'Flight confirmation from San Francisco to New York JFK on December 22, 2024.',
  bundleType: 'travel',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_flight_1',
  id: flightThreadId,
  isRead: true,
  labels: ['INBOX', 'CATEGORY_TRAVEL'],
  lastMessageAt: subDays(new Date(), 2),
  messageCount: 2,
  participantEmails: ['noreply@united.com', userEmail],
  snippet:
    'Thank you for booking with United Airlines. Your flight UA 1234 from SFO to JFK on Dec 22 is confirmed.',
  subject: 'Your flight to New York is confirmed - UA 1234',
});

// Hotel reservation
await db.insert(EmailThreads).values({
  aiSummary:
    'Hotel reservation at The Plaza Hotel in New York from December 22-25, 2024.',
  bundleType: 'travel',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_hotel_1',
  id: hotelThreadId,
  isRead: true,
  labels: ['INBOX', 'CATEGORY_TRAVEL'],
  lastMessageAt: subDays(new Date(), 3),
  messageCount: 1,
  participantEmails: ['reservations@theplaza.com', userEmail],
  snippet:
    'Your reservation at The Plaza Hotel, New York from Dec 22-25 has been confirmed.',
  subject: 'Hotel Reservation Confirmation - The Plaza Hotel',
});

// Amazon order
await db.insert(EmailThreads).values({
  aiSummary:
    'Amazon order shipped: MacBook Pro 14" M3 Pro, arriving December 21, 2024.',
  bundleType: 'purchases',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_amazon_1',
  id: amazonThreadId,
  isRead: false,
  labels: ['INBOX', 'CATEGORY_PURCHASES'],
  lastMessageAt: subDays(new Date(), 1),
  messageCount: 1,
  participantEmails: ['ship-confirm@amazon.com', userEmail],
  snippet:
    'Your order #112-3456789-0123456 containing MacBook Pro 14" has shipped via UPS.',
  subject: 'Your Amazon.com order has shipped',
});

// Bank statement
await db.insert(EmailThreads).values({
  aiSummary: 'Monthly bank statement for December 2024, balance $12,345.67.',
  bundleType: 'finance',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_bank_1',
  id: bankThreadId,
  isRead: true,
  labels: ['INBOX', 'CATEGORY_FINANCE'],
  lastMessageAt: subDays(new Date(), 5),
  messageCount: 1,
  participantEmails: ['statements@chase.com', userEmail],
  snippet:
    'Your monthly statement for account ending in 4567 is now available.',
  subject: 'Your Bank Statement for December 2024',
});

// Meeting request
await db.insert(EmailThreads).values({
  aiSummary:
    'Meeting request from Sarah Johnson about Q1 planning, proposed for next Tuesday at 2pm.',
  bundleType: 'personal',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_meeting_1',
  id: meetingThreadId,
  isRead: false,
  labels: ['INBOX', 'IMPORTANT'],
  lastMessageAt: subHours(new Date(), 6),
  messageCount: 5,
  participantEmails: [
    'sarah.johnson@company.com',
    'john.doe@company.com',
    userEmail,
  ],
  snippet:
    'Hi, following up on our discussion about Q1 goals. Can we meet next Tuesday at 2pm?',
  subject: 'Meeting with John about Q1 planning',
});

// Newsletter
await db.insert(EmailThreads).values({
  aiSummary: 'Weekly tech newsletter with latest AI news and trends.',
  bundleType: 'promos',
  gmailAccountId,
  gmailThreadId: 'gmail_thread_newsletter_1',
  id: newsletterThreadId,
  isRead: true,
  labels: ['INBOX', 'CATEGORY_PROMOTIONS'],
  lastMessageAt: subDays(new Date(), 1),
  messageCount: 1,
  participantEmails: ['newsletter@techcrunch.com', userEmail],
  snippet:
    'This week in AI: OpenAI releases new model, Google announces Gemini updates...',
  subject: 'TechCrunch Weekly: AI Revolution Continues',
});

// Update search vectors
console.log('🔍 Updating search vectors...');

await db.execute(sql`
  UPDATE "emailThreads"
  SET "searchVector" = to_tsvector('english',
    COALESCE("subject", '') || ' ' ||
    COALESCE("snippet", '') || ' ' ||
    COALESCE("aiSummary", '')
  )
`);

// ============================================================================
// Seed Email Messages
// ============================================================================

console.log('✉️  Seeding email messages...');

// Flight messages
await db.insert(EmailMessages).values({
  attachmentMeta: [
    {
      filename: 'boarding_pass.pdf',
      mimeType: 'application/pdf',
      size: 125000,
    },
  ],
  bodyPreview: `Dear Traveler,

Thank you for choosing United Airlines!

Your flight booking has been confirmed:

Flight: UA 1234
Route: San Francisco (SFO) → New York JFK
Date: December 22, 2024
Departure: 8:00 AM PST
Arrival: 4:30 PM EST

Confirmation Code: ABC123

Please arrive at the airport at least 2 hours before departure.

Safe travels!
United Airlines`,
  fromEmail: 'noreply@united.com',
  fromName: 'United Airlines',
  gmailMessageId: 'gmail_msg_flight_1',
  hasAttachments: true,
  internalDate: subDays(new Date(), 2),
  isFromUser: false,
  snippet:
    'Thank you for booking with United Airlines. Your flight UA 1234 from SFO to JFK on Dec 22 is confirmed.',
  subject: 'Your flight to New York is confirmed - UA 1234',
  threadId: flightThreadId,
  toEmails: [userEmail],
});

await db.insert(EmailMessages).values({
  bodyPreview:
    'Thanks for the booking confirmation! Looking forward to the trip.',
  fromEmail: userEmail,
  fromName: 'Chris Watts',
  gmailMessageId: 'gmail_msg_flight_2',
  hasAttachments: false,
  internalDate: subDays(new Date(), 2),
  isFromUser: true,
  snippet: 'Thanks for the booking confirmation!',
  subject: 'Re: Your flight to New York is confirmed - UA 1234',
  threadId: flightThreadId,
  toEmails: ['noreply@united.com'],
});

// Hotel message
await db.insert(EmailMessages).values({
  bodyPreview: `Dear Guest,

We are pleased to confirm your reservation at The Plaza Hotel.

Reservation Details:
- Confirmation Number: PLZ12345
- Check-in: December 22, 2024 at 3:00 PM
- Check-out: December 25, 2024 at 11:00 AM
- Room Type: Deluxe King Suite
- Total: $1,850.00

Address: 768 5th Avenue, New York, NY 10019

We look forward to welcoming you!

Best regards,
The Plaza Hotel Reservations Team`,
  fromEmail: 'reservations@theplaza.com',
  fromName: 'The Plaza Hotel',
  gmailMessageId: 'gmail_msg_hotel_1',
  hasAttachments: false,
  internalDate: subDays(new Date(), 3),
  isFromUser: false,
  snippet:
    'Your reservation at The Plaza Hotel, New York from Dec 22-25 has been confirmed.',
  subject: 'Hotel Reservation Confirmation - The Plaza Hotel',
  threadId: hotelThreadId,
  toEmails: [userEmail],
});

// Amazon message
await db.insert(EmailMessages).values({
  bodyPreview: `Hello,

Your order has shipped!

Order #112-3456789-0123456

Items in this shipment:
- Apple MacBook Pro 14" M3 Pro - $1,999.00

Shipping Address:
123 Main St, San Francisco, CA 94105

Carrier: UPS
Tracking Number: 1Z999AA10123456784

Expected delivery: December 21, 2024

Track your package: https://amazon.com/track

Thank you for shopping with us!
Amazon.com`,
  fromEmail: 'ship-confirm@amazon.com',
  fromName: 'Amazon.com',
  gmailMessageId: 'gmail_msg_amazon_1',
  hasAttachments: false,
  internalDate: subDays(new Date(), 1),
  isFromUser: false,
  snippet: 'Your order containing MacBook Pro 14" has shipped via UPS.',
  subject: 'Your Amazon.com order has shipped',
  threadId: amazonThreadId,
  toEmails: [userEmail],
});

// Bank statement message
await db.insert(EmailMessages).values({
  attachmentMeta: [
    {
      filename: 'statement_dec_2024.pdf',
      mimeType: 'application/pdf',
      size: 250000,
    },
  ],
  bodyPreview: `Dear Customer,

Your monthly statement for account ending in 4567 is now available.

Statement Period: December 1-31, 2024
Total Balance: $12,345.67
Available Credit: $15,000.00

View your full statement online at chase.com

Thank you for banking with Chase.`,
  fromEmail: 'statements@chase.com',
  fromName: 'Chase Bank',
  gmailMessageId: 'gmail_msg_bank_1',
  hasAttachments: true,
  internalDate: subDays(new Date(), 5),
  isFromUser: false,
  snippet:
    'Your monthly statement for account ending in 4567 is now available.',
  subject: 'Your Bank Statement for December 2024',
  threadId: bankThreadId,
  toEmails: [userEmail],
});

// Meeting messages (thread with multiple messages)
await db.insert(EmailMessages).values({
  bodyPreview: `Hi team,

I wanted to schedule a meeting to discuss our Q1 planning. We need to review goals and align on priorities.

Let me know your availability.

Thanks,
Sarah`,
  fromEmail: 'sarah.johnson@company.com',
  fromName: 'Sarah Johnson',
  gmailMessageId: 'gmail_msg_meeting_1',
  hasAttachments: false,
  internalDate: subDays(new Date(), 2),
  isFromUser: false,
  snippet: 'I wanted to schedule a meeting to discuss our Q1 planning.',
  subject: 'Meeting with John about Q1 planning',
  threadId: meetingThreadId,
  toEmails: [userEmail, 'john.doe@company.com'],
});

await db.insert(EmailMessages).values({
  bodyPreview: `Hi Sarah,

Tuesday at 2pm works for me. Let's meet in Conference Room A.

Best,
Chris`,
  fromEmail: userEmail,
  fromName: 'Chris Watts',
  gmailMessageId: 'gmail_msg_meeting_2',
  hasAttachments: false,
  internalDate: subDays(new Date(), 2),
  isFromUser: true,
  snippet: 'Tuesday at 2pm works for me.',
  subject: 'Re: Meeting with John about Q1 planning',
  threadId: meetingThreadId,
  toEmails: ['sarah.johnson@company.com', 'john.doe@company.com'],
});

await db.insert(EmailMessages).values({
  bodyPreview: `Perfect! I'll send the calendar invite.

Sarah`,
  fromEmail: 'sarah.johnson@company.com',
  fromName: 'Sarah Johnson',
  gmailMessageId: 'gmail_msg_meeting_3',
  hasAttachments: false,
  internalDate: subDays(new Date(), 1),
  isFromUser: false,
  snippet: "Perfect! I'll send the calendar invite.",
  subject: 'Re: Meeting with John about Q1 planning',
  threadId: meetingThreadId,
  toEmails: [userEmail, 'john.doe@company.com'],
});

await db.insert(EmailMessages).values({
  attachmentMeta: [
    {
      filename: 'Q1_Agenda.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 45000,
    },
  ],
  bodyPreview: `Hi all,

Just following up - can we meet next Tuesday at 2pm as discussed? I've prepared the agenda:

1. Review Q4 results
2. Set Q1 OKRs
3. Resource allocation
4. Timeline discussion

Please confirm!

Thanks,
Sarah`,
  fromEmail: 'sarah.johnson@company.com',
  fromName: 'Sarah Johnson',
  gmailMessageId: 'gmail_msg_meeting_4',
  hasAttachments: true,
  internalDate: subHours(new Date(), 6),
  isFromUser: false,
  snippet:
    'Following up on our discussion about Q1 goals. Can we meet next Tuesday at 2pm?',
  subject: 'Re: Meeting with John about Q1 planning',
  threadId: meetingThreadId,
  toEmails: [userEmail, 'john.doe@company.com'],
});

// Newsletter message
await db.insert(EmailMessages).values({
  bodyPreview: `This Week in Tech

🤖 AI News:
- OpenAI releases GPT-5 preview
- Google announces Gemini 2.0 with improved reasoning
- Anthropic's Claude sets new benchmark records

💻 Developer Tools:
- Bun 2.0 released with faster bundling
- Next.js 15 introduces new caching strategies
- TypeScript 5.4 adds new utility types

Read more at techcrunch.com

Unsubscribe | Manage Preferences`,
  fromEmail: 'newsletter@techcrunch.com',
  fromName: 'TechCrunch',
  gmailMessageId: 'gmail_msg_newsletter_1',
  hasAttachments: false,
  internalDate: subDays(new Date(), 1),
  isFromUser: false,
  snippet:
    'This week in AI: OpenAI releases new model, Google announces Gemini updates...',
  subject: 'TechCrunch Weekly: AI Revolution Continues',
  threadId: newsletterThreadId,
  toEmails: [userEmail],
});

// ============================================================================
// Seed Email Keywords
// ============================================================================

console.log('🏷️  Seeding email keywords...');

// Flight keywords
const flightKeywords = [
  { keyword: 'flight', keywordType: 'topic' as const, originalText: 'flight' },
  {
    keyword: 'united airlines',
    keywordType: 'company' as const,
    originalText: 'United Airlines',
  },
  {
    keyword: 'new york',
    keywordType: 'location' as const,
    originalText: 'New York',
  },
  { keyword: 'jfk', keywordType: 'location' as const, originalText: 'JFK' },
  {
    keyword: 'san francisco',
    keywordType: 'location' as const,
    originalText: 'San Francisco',
  },
  { keyword: 'sfo', keywordType: 'location' as const, originalText: 'SFO' },
  {
    keyword: 'december 22',
    keywordType: 'temporal' as const,
    originalText: 'December 22, 2024',
  },
  {
    keyword: 'ua 1234',
    keywordType: 'product' as const,
    originalText: 'UA 1234',
  },
  {
    keyword: 'abc123',
    keywordType: 'product' as const,
    originalText: 'ABC123',
  },
];

for (const kw of flightKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.95,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: flightThreadId,
  });
}

// Hotel keywords
const hotelKeywords = [
  { keyword: 'hotel', keywordType: 'topic' as const, originalText: 'hotel' },
  {
    keyword: 'the plaza hotel',
    keywordType: 'company' as const,
    originalText: 'The Plaza Hotel',
  },
  {
    keyword: 'new york',
    keywordType: 'location' as const,
    originalText: 'New York',
  },
  {
    keyword: 'reservation',
    keywordType: 'topic' as const,
    originalText: 'reservation',
  },
  {
    keyword: 'december 22',
    keywordType: 'temporal' as const,
    originalText: 'December 22, 2024',
  },
  {
    keyword: 'december 25',
    keywordType: 'temporal' as const,
    originalText: 'December 25, 2024',
  },
  {
    keyword: '$1,850.00',
    keywordType: 'financial' as const,
    originalText: '$1,850.00',
  },
  {
    keyword: 'plz12345',
    keywordType: 'product' as const,
    originalText: 'PLZ12345',
  },
];

for (const kw of hotelKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.92,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: hotelThreadId,
  });
}

// Amazon keywords
const amazonKeywords = [
  {
    keyword: 'amazon',
    keywordType: 'company' as const,
    originalText: 'Amazon.com',
  },
  {
    keyword: 'macbook pro',
    keywordType: 'product' as const,
    originalText: 'MacBook Pro 14"',
  },
  { keyword: 'apple', keywordType: 'company' as const, originalText: 'Apple' },
  { keyword: 'order', keywordType: 'topic' as const, originalText: 'order' },
  {
    keyword: 'shipped',
    keywordType: 'action' as const,
    originalText: 'shipped',
  },
  { keyword: 'ups', keywordType: 'company' as const, originalText: 'UPS' },
  {
    keyword: '$1,999.00',
    keywordType: 'financial' as const,
    originalText: '$1,999.00',
  },
  {
    keyword: 'december 21',
    keywordType: 'temporal' as const,
    originalText: 'December 21, 2024',
  },
  {
    keyword: '1z999aa10123456784',
    keywordType: 'product' as const,
    originalText: '1Z999AA10123456784',
  },
];

for (const kw of amazonKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.88,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: amazonThreadId,
  });
}

// Bank keywords
const bankKeywords = [
  { keyword: 'chase', keywordType: 'company' as const, originalText: 'Chase' },
  { keyword: 'bank', keywordType: 'topic' as const, originalText: 'bank' },
  {
    keyword: 'statement',
    keywordType: 'topic' as const,
    originalText: 'statement',
  },
  {
    keyword: '$12,345.67',
    keywordType: 'financial' as const,
    originalText: '$12,345.67',
  },
  {
    keyword: 'december 2024',
    keywordType: 'temporal' as const,
    originalText: 'December 2024',
  },
  {
    keyword: 'account 4567',
    keywordType: 'product' as const,
    originalText: 'account ending in 4567',
  },
];

for (const kw of bankKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.9,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: bankThreadId,
  });
}

// Meeting keywords
const meetingKeywords = [
  {
    keyword: 'sarah johnson',
    keywordType: 'person' as const,
    originalText: 'Sarah Johnson',
  },
  {
    keyword: 'john doe',
    keywordType: 'person' as const,
    originalText: 'John Doe',
  },
  {
    keyword: 'meeting',
    keywordType: 'topic' as const,
    originalText: 'meeting',
  },
  {
    keyword: 'q1 planning',
    keywordType: 'topic' as const,
    originalText: 'Q1 planning',
  },
  {
    keyword: 'tuesday',
    keywordType: 'temporal' as const,
    originalText: 'Tuesday',
  },
  { keyword: '2pm', keywordType: 'temporal' as const, originalText: '2pm' },
  { keyword: 'okrs', keywordType: 'topic' as const, originalText: 'OKRs' },
];

for (const kw of meetingKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.85,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: meetingThreadId,
  });
}

// Newsletter keywords
const newsletterKeywords = [
  {
    keyword: 'techcrunch',
    keywordType: 'company' as const,
    originalText: 'TechCrunch',
  },
  { keyword: 'ai', keywordType: 'topic' as const, originalText: 'AI' },
  {
    keyword: 'openai',
    keywordType: 'company' as const,
    originalText: 'OpenAI',
  },
  {
    keyword: 'google',
    keywordType: 'company' as const,
    originalText: 'Google',
  },
  {
    keyword: 'gemini',
    keywordType: 'product' as const,
    originalText: 'Gemini',
  },
  {
    keyword: 'anthropic',
    keywordType: 'company' as const,
    originalText: 'Anthropic',
  },
  {
    keyword: 'newsletter',
    keywordType: 'topic' as const,
    originalText: 'newsletter',
  },
];

for (const kw of newsletterKeywords) {
  await db.insert(EmailKeywords).values({
    confidence: 0.8,
    keyword: kw.keyword,
    keywordType: kw.keywordType,
    originalText: kw.originalText,
    threadId: newsletterThreadId,
  });
}

// ============================================================================
// Done
// ============================================================================

console.log('✅ Seed complete!');
console.log('');
console.log('📊 Summary:');
console.log(`   - 1 User: ${userEmail}`);
console.log(`   - 1 Org: ${orgName}`);
console.log(`   - 1 Gmail Account: ${gmailAccountId}`);
console.log(
  '   - 6 Email Threads (travel, purchases, finance, personal, promos)',
);
console.log('   - 10 Email Messages');
console.log(
  `   - ${flightKeywords.length + hotelKeywords.length + amazonKeywords.length + bankKeywords.length + meetingKeywords.length + newsletterKeywords.length} Keywords`,
);
console.log('');
console.log('🔑 Test with:');
console.log(`   Gmail Account ID: ${gmailAccountId}`);

process.exit(0);
