import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const posts = [
  {
    title: 'How to Price Your House Cleaning Services for Maximum Profit',
    slug: 'how-to-price-house-cleaning-services',
    excerpt: 'Learn proven pricing strategies that help cleaning business owners charge what they\'re worth, cover costs, and grow profitably.',
    metaTitle: 'How to Price House Cleaning Services (2026 Guide)',
    metaDescription: 'Discover the best pricing strategies for house cleaning businesses. Learn flat rate vs hourly, how to calculate costs, and set prices that maximize profit.',
    content: `<h2>Why Pricing Is the #1 Decision in Your Cleaning Business</h2>
<p>Most cleaning business owners underprice their services. They look at what competitors charge, knock 10% off, and hope for the best. That's a race to the bottom — and it's why so many cleaning companies struggle to break even in their first two years.</p>
<p>The truth is, pricing is the single biggest lever you have. A $10 increase per job across 80 monthly cleanings puts an extra $9,600 in your pocket every year. Let's make sure you're capturing every dollar you deserve.</p>

<h2>Flat Rate vs. Hourly: Which Model Wins?</h2>
<p><strong>Hourly pricing</strong> sounds fair, but it punishes efficiency. The faster your team gets, the less you earn. Clients also hate the uncertainty — they don't know what the final bill will be.</p>
<p><strong>Flat rate pricing</strong> based on square footage, bedroom count, or a walkthrough estimate is almost always better. It rewards your team for working efficiently, gives clients a predictable price, and makes your revenue easier to forecast.</p>
<p>A common structure:</p>
<ul>
<li>Studio / 1-bedroom apartment: $120–$150</li>
<li>2-bedroom home: $150–$200</li>
<li>3-bedroom home: $200–$280</li>
<li>4+ bedroom home: $280–$400+</li>
</ul>
<p>These are starting points. Your local market, cost of living, and quality of service will push them up or down.</p>

<h2>Calculate Your True Cost Per Clean</h2>
<p>Before setting prices, you need to know your <em>break-even number</em>. Add up:</p>
<ul>
<li><strong>Labor:</strong> What you pay cleaners per hour, including payroll taxes (add 15–20% on top of the wage)</li>
<li><strong>Supplies:</strong> Cleaning products, equipment wear, replacement costs</li>
<li><strong>Drive time:</strong> Gas, mileage, travel between jobs</li>
<li><strong>Insurance:</strong> General liability, workers' comp, bonding</li>
<li><strong>Overhead:</strong> Software, phone, marketing, accounting</li>
</ul>
<p>Once you have your cost per clean, add your profit margin. Most healthy cleaning businesses target 30–50% gross margins.</p>

<h2>The Deep Clean Upsell</h2>
<p>Always offer a <strong>first-time deep clean</strong> at a premium (typically 1.5x–2x your standard rate). The home needs it, your team needs the extra time, and it sets the baseline for recurring cleans.</p>
<p>Frame it as: "We start every new client with a deep clean so your recurring visits stay consistently spotless." Clients understand and rarely push back.</p>

<h2>Recurring Discounts That Actually Work</h2>
<p>Offering a discount for recurring service makes sense — predictable revenue is worth a small margin hit. A standard approach:</p>
<ul>
<li>Weekly: 15% off</li>
<li>Bi-weekly: 10% off</li>
<li>Monthly: 5% off</li>
<li>One-time: Full price</li>
</ul>
<p>The key is making one-time cleans expensive enough that recurring becomes the obvious choice for clients.</p>

<h2>When to Raise Prices</h2>
<p>If you're booked out more than 2 weeks, you're underpriced. Raise prices for new clients immediately and notify existing clients with 30 days' notice. Most won't leave — and the ones who do were likely your most price-sensitive (and often most difficult) clients.</p>
<p>A good rule: raise prices 5–8% annually to keep up with inflation and rising labor costs.</p>`,
  },
  {
    title: 'How to Hire and Keep Great Cleaning Staff (Without Losing Your Mind)',
    slug: 'how-to-hire-retain-cleaning-staff',
    excerpt: 'Finding reliable cleaners is the hardest part of running a cleaning business. Here\'s a repeatable system for hiring, training, and retaining top talent.',
    metaTitle: 'How to Hire & Retain Cleaning Staff (Complete Guide)',
    metaDescription: 'Struggling to find reliable cleaners? Learn where to recruit, how to screen applicants, training best practices, and retention strategies that reduce turnover.',
    content: `<h2>The Staffing Crisis Nobody Talks About</h2>
<p>Ask any cleaning business owner what keeps them up at night, and they'll say the same thing: finding good people. The cleaning industry has turnover rates above 200% — meaning the average position turns over twice a year. That's not a people problem. It's a systems problem.</p>

<h2>Where to Find Cleaning Staff</h2>
<ul>
<li><strong>Indeed and Craigslist</strong> — Still the highest volume for hourly positions. Post fresh ads weekly.</li>
<li><strong>Facebook Groups</strong> — Local community groups, "jobs in [city]" groups, and cleaning-specific groups</li>
<li><strong>Referral bonuses</strong> — Pay your current staff $100–$200 for every hire that lasts 90 days.</li>
<li><strong>Local workforce programs</strong> — Community colleges, reentry programs, and immigrant services organizations.</li>
</ul>

<h2>Screening That Saves You Headaches</h2>
<ul>
<li><strong>Phone screen first:</strong> A 5-minute call tells you if they're responsive, professional, and available.</li>
<li><strong>Working interview:</strong> Bring them on a real job for 2–3 hours (paid). Watch how they work and handle feedback.</li>
<li><strong>Background check:</strong> Non-negotiable. You're entering people's homes.</li>
<li><strong>Reference check:</strong> Call the last two employers. Ask: "Would you rehire this person?"</li>
</ul>

<h2>Training That Sticks</h2>
<ul>
<li><strong>Day 1–3:</strong> Shadow an experienced cleaner. Observe only.</li>
<li><strong>Day 4–5:</strong> Clean alongside a trainer who corrects in real-time.</li>
<li><strong>Week 2:</strong> Solo cleans with a quality check-in at the end of each day.</li>
<li><strong>Day 30:</strong> Performance review. Are they meeting your standards?</li>
</ul>
<p>Create a simple checklist for every room type. Laminate it. Cleaners carry it until the routine is second nature.</p>

<h2>Why Good Cleaners Leave (And How to Stop It)</h2>
<ol>
<li><strong>Inconsistent hours</strong> — Fill their schedule before hiring more people.</li>
<li><strong>No appreciation</strong> — Weekly "great job" texts, cleaner of the month recognition, or small bonuses go a long way.</li>
<li><strong>Bad clients</strong> — Don't make your staff endure abusive clients. Fire those clients.</li>
<li><strong>No growth path</strong> — Offer lead cleaner roles, training positions, or profit-sharing.</li>
</ol>
<p>Pay competitively, pay on time every time, and treat people with respect.</p>`,
  },
  {
    title: 'From Solo Cleaner to Cleaning Company: A Growth Roadmap',
    slug: 'solo-cleaner-to-cleaning-company-growth',
    excerpt: 'Ready to stop trading hours for dollars? Here\'s a step-by-step plan to grow from solo cleaner to cleaning company owner.',
    metaTitle: 'Solo Cleaner to Cleaning Company: Step-by-Step Growth Guide',
    metaDescription: 'Learn how to transition from solo house cleaner to cleaning company owner. Covers when to hire, how to systemize, and the key milestones from $0 to $500K.',
    content: `<h2>The Solo Cleaner Trap</h2>
<p>You started cleaning because you're good at it. Maybe you left a cleaning company to go solo and keep more of the money. And it worked — for a while. But now you're maxed out at 6–8 houses a day, your body hurts, and you can't take a vacation without losing income.</p>

<h2>Stage 1: Systemize Before You Hire ($0–$80K)</h2>
<ul>
<li><strong>CRM software:</strong> Track every client, their preferences, payment history.</li>
<li><strong>Scheduling system:</strong> Automated reminders, route optimization, recurring bookings.</li>
<li><strong>Standard checklist:</strong> Document exactly how you clean every room.</li>
<li><strong>Pricing structure:</strong> Move from "whatever feels right" to a clear pricing matrix.</li>
</ul>

<h2>Stage 2: Your First Hire ($80K–$150K)</h2>
<p>Your first hire should clean with you, not instead of you. Start them on your easiest, most forgiving clients. You're building capacity while still generating revenue.</p>

<h2>Stage 3: Two Teams ($150K–$300K)</h2>
<p>The hardest transition. You stop cleaning and start managing: quality control, client communication, hiring, marketing. Revenue may dip temporarily — push through it.</p>

<h2>Stage 4: Real Business ($300K–$500K+)</h2>
<p>At this level, you need a team lead or operations manager, proper bookkeeping, consistent marketing, and employee policies. The business starts working without you.</p>

<h2>The Revenue Math</h2>
<ul>
<li><strong>Solo:</strong> 6 cleans/day × $150 × 22 days = $19,800/month ($237K/year)</li>
<li><strong>2 teams:</strong> 12 cleans/day × $170 × 22 days = $44,880/month ($538K/year)</li>
<li><strong>3 teams:</strong> 18 cleans/day × $175 × 22 days = $69,300/month ($831K/year)</li>
</ul>
<p>Your margins are lower with employees (25–40% net), but total profit is much higher — and you're not destroying your body to earn it.</p>`,
  },
  {
    title: 'How to Get Your First 50 Cleaning Clients',
    slug: 'get-first-50-cleaning-clients',
    excerpt: 'A practical marketing playbook for new cleaning businesses. No fluff — just the channels and tactics that actually work.',
    metaTitle: 'How to Get Your First 50 Cleaning Clients (Proven Tactics)',
    metaDescription: 'New cleaning business? Learn the fastest ways to get your first 50 clients using Google, referrals, Nextdoor, and local marketing strategies that actually work.',
    content: `<h2>The Cold Start Problem</h2>
<p>Starting with zero clients is intimidating. No reviews, no referrals, no reputation. But every successful cleaning company started exactly where you are.</p>

<h2>Clients 1–10: Your Inner Circle</h2>
<p>Friends, family, neighbors, former coworkers. Post on your personal social media: "I've started a house cleaning business. If you or anyone you know needs a reliable cleaner, I'd love to help."</p>

<h2>Clients 10–25: Google and Nextdoor</h2>
<ul>
<li><strong>Google Business Profile:</strong> Free. Appears in "house cleaning near me" searches. Get every client to leave a review.</li>
<li><strong>Nextdoor:</strong> Neighbors recommending services. Claim your business page and respond to every "looking for a cleaner" post.</li>
<li><strong>Yelp:</strong> Claim your listing. Many people still check Yelp before hiring home service providers.</li>
</ul>

<h2>Clients 25–50: Referral Engine and Paid Ads</h2>
<ul>
<li><strong>Referral program:</strong> $25–$50 credit for every referral that books.</li>
<li><strong>Google Ads:</strong> Start with $10–$20/day targeting "house cleaning [your city]."</li>
<li><strong>Door hangers:</strong> Target neighborhoods where you already clean.</li>
<li><strong>Partnerships:</strong> Real estate agents, property managers, Airbnb hosts.</li>
</ul>

<h2>The Review Flywheel</h2>
<ol>
<li>Send a thank-you text after every clean</li>
<li>Include a direct link to your Google review page</li>
<li>Follow up 24 hours later if they haven't reviewed</li>
<li>Respond to every review — positive and negative</li>
</ol>
<p>At 20+ five-star Google reviews, you'll start getting inbound leads without spending a dollar on ads.</p>

<h2>What NOT to Do</h2>
<ul>
<li>Don't compete on price — being the cheapest attracts the worst clients.</li>
<li>Don't rely on lead-gen platforms like Thumbtack as your main channel.</li>
<li>Don't ignore online presence — if someone Googles you and finds nothing, they'll hire someone else.</li>
</ul>`,
  },
  {
    title: '7 Scheduling Mistakes That Cost Cleaning Businesses Thousands',
    slug: 'scheduling-mistakes-cleaning-businesses',
    excerpt: 'Poor scheduling is silently killing your margins. Here are the 7 most common mistakes and how to fix each one.',
    metaTitle: '7 Scheduling Mistakes Costing Your Cleaning Business Money',
    metaDescription: 'Discover the 7 scheduling mistakes that cost cleaning businesses thousands annually. Learn route optimization, buffer time, and scheduling best practices.',
    content: `<h2>Scheduling Is Where Profit Goes to Die</h2>
<p>You can have the best cleaners, perfect pricing, and a full client roster — and still barely break even if your scheduling is a mess.</p>

<h2>Mistake #1: No Route Optimization</h2>
<p>If your team is zig-zagging across town, you're burning gas and time. <strong>Fix:</strong> Group clients by neighborhood and day. Even 15 minutes saved per drive adds up to 5+ hours per month per team.</p>

<h2>Mistake #2: No Buffer Time Between Jobs</h2>
<p>Back-to-back scheduling means one late job cascades into the rest of the day. <strong>Fix:</strong> Build in 15–30 minutes between jobs.</p>

<h2>Mistake #3: Accepting Any Schedule</h2>
<p>When clients dictate exact times, your schedule becomes unmovable blocks with dead time between them. <strong>Fix:</strong> Offer time windows, not exact times.</p>

<h2>Mistake #4: No Cancellation Policy</h2>
<p>Same-day cancellations cost revenue and leave unfillable holes. <strong>Fix:</strong> Require 48-hour notice or charge a cancellation fee (50% of service cost).</p>

<h2>Mistake #5: Overbooking Fridays, Ignoring Mondays</h2>
<p>Everyone wants Friday cleans. <strong>Fix:</strong> Offer a small discount for off-peak days to balance your week.</p>

<h2>Mistake #6: Manual Scheduling</h2>
<p>Spreadsheets and text messages cost you hours per week. <strong>Fix:</strong> Use a cleaning business CRM with automated scheduling.</p>

<h2>Mistake #7: Not Tracking Drive Time</h2>
<p>If drive time is invisible, you can't optimize it. <strong>Fix:</strong> Track clock-in at each job site. Measure and reduce drive time separately.</p>`,
  },
  {
    title: 'Handling Difficult Cleaning Clients: Scripts and Strategies',
    slug: 'handling-difficult-cleaning-clients',
    excerpt: 'Every cleaning business deals with tough clients. Learn professional scripts for complaints, scope creep, late payments, and when to fire a client.',
    metaTitle: 'How to Handle Difficult Cleaning Clients (With Scripts)',
    metaDescription: 'Professional strategies and word-for-word scripts for handling cleaning client complaints, scope creep, no-shows, and late payments. Know when to fire a client.',
    content: `<h2>Difficult Clients Are Inevitable. Drama Isn't.</h2>
<p>How you handle difficult situations determines whether they cost you money or make your business stronger.</p>

<h2>The Chronic Complainer</h2>
<p><strong>Script:</strong> "I want to make sure we're meeting your expectations every time. Can we walk through the home together so I can note exactly what matters most to you? We'll add those to your custom cleaning checklist."</p>

<h2>Scope Creep</h2>
<p>They booked a standard clean but keep asking for extras.</p>
<p><strong>Script:</strong> "We'd love to take care of that! That's outside our standard clean, but we can add it for $X. Would you like me to include it today?"</p>

<h2>The Late Payer</h2>
<p><strong>Script:</strong> "Hi [name], I noticed the invoice from [date] is still outstanding. Going forward, we'll need to process payment before each visit to keep your spot on our schedule."</p>

<h2>The Last-Minute Canceller</h2>
<p><strong>Script:</strong> "We understand plans change. Per our cancellation policy, cancellations within 48 hours incur a fee. We send reminders 48 hours in advance so you always have time to reschedule."</p>

<h2>When to Fire a Client</h2>
<p>Fire a client when they're abusive to staff, consistently pay late, or demand more than they pay for every time.</p>
<p><strong>Script:</strong> "After careful consideration, we've decided that we're not the best fit for your cleaning needs. We want to give you two weeks' notice so you have time to find a new service. We wish you all the best."</p>
<p>Short, professional, no blame. A toxic client slot is better filled by a great client who values your work.</p>`,
  },
  {
    title: 'Insurance, Bonding, and LLC: Legal Essentials for Cleaning Businesses',
    slug: 'cleaning-business-insurance-bonding-llc',
    excerpt: 'Protect your cleaning business from lawsuits, theft claims, and accidents. Here\'s exactly what coverage you need and what it costs.',
    metaTitle: 'Cleaning Business Insurance, Bonding & LLC Guide (2026)',
    metaDescription: 'Everything cleaning business owners need to know about general liability insurance, surety bonds, workers comp, and LLC formation. Costs, requirements, and tips.',
    content: `<h2>One Accident Can End Your Business</h2>
<p>Your cleaner knocks over a $3,000 vase. Or slips and breaks their wrist. Or a client claims jewelry went missing. Without proper protection, any of these could bankrupt you.</p>

<h2>General Liability Insurance (Required)</h2>
<p>Covers property damage and bodily injury. Many clients won't hire you without it. <strong>Cost:</strong> $400–$800/year. Get at least $1M per occurrence / $2M aggregate.</p>

<h2>Surety Bond (Highly Recommended)</h2>
<p>Covers employee theft. "Licensed, bonded, and insured" is the trust signal clients look for. <strong>Cost:</strong> $100–$300/year.</p>

<h2>Workers' Compensation (Usually Required)</h2>
<p>Covers medical bills and lost wages for on-the-job injuries. Most states require it as soon as you have one employee. <strong>Cost:</strong> $0.50–$2.00 per $100 of payroll.</p>

<h2>Commercial Auto Insurance</h2>
<p>Personal auto policies typically exclude business use. At minimum, get a business-use rider on your personal policy.</p>

<h2>LLC Formation</h2>
<p>Separates personal assets from business liabilities. <strong>Cost:</strong> $50–$500 depending on your state. File with your Secretary of State, get an EIN from the IRS (free), and open a business bank account.</p>

<h2>The Bottom Line</h2>
<p>Expect $1,000–$2,000/year for full protection. That's less than a single lawsuit would cost. Build these costs into your pricing.</p>`,
  },
  {
    title: '10 Marketing Ideas for Cleaning Companies That Actually Work',
    slug: 'marketing-ideas-cleaning-companies',
    excerpt: 'Skip the generic advice. Here are 10 specific, proven marketing tactics that cleaning business owners are using right now to get more clients.',
    metaTitle: '10 Marketing Ideas for Cleaning Companies (That Actually Work)',
    metaDescription: '10 proven marketing strategies for house cleaning businesses. From Google reviews to referral programs, learn what actually fills your cleaning schedule.',
    content: `<h2>Marketing Doesn't Have to Be Complicated</h2>
<p>You need a few reliable channels that consistently bring in qualified leads. Here are 10 that work.</p>

<h2>1. Google Business Profile (Free, High Impact)</h2>
<p>The single most important marketing asset for a local cleaning business. Claim it, add photos, post weekly, respond to every review.</p>

<h2>2. Automated Review Requests</h2>
<p>After every clean, send a text with a direct link to your Google review page. Target 2–3 new reviews per week.</p>

<h2>3. Referral Program</h2>
<p>$25 credit for every referral that books. Make it two-sided — referrer AND new client each get $25 off.</p>

<h2>4. Before/After Photos on Social Media</h2>
<p>Nothing sells cleaning like a dramatic before/after. Post on Instagram and Facebook with client permission.</p>

<h2>5. Nextdoor Presence</h2>
<p>Where homeowners ask neighbors for recommendations. Claim your page and respond to every "looking for a cleaner" post.</p>

<h2>6. Door Hangers in Target Neighborhoods</h2>
<p>After cleaning a home, drop hangers on 10–15 neighboring houses: "We just cleaned your neighbor's home. Here's 10% off."</p>

<h2>7. Google Ads (Local Search)</h2>
<p>$15/day targeting "house cleaning [your city]." Track cost per booked client — aim under $50.</p>

<h2>8. Partnership with Real Estate Agents</h2>
<p>Realtors need move-in/move-out cleaning for every transaction. One good relationship = 3–5 jobs/month.</p>

<h2>9. Seasonal Deep Clean Promotions</h2>
<p>Spring cleaning (March), back-to-school (August), pre-holiday (November), New Year (January).</p>

<h2>10. Simple Website with Online Booking</h2>
<p>What you do, what it costs, your reviews, and a way to book. If clients can't book in 60 seconds, they'll go elsewhere.</p>

<h2>The 80/20 Rule</h2>
<p>Pick 3: Google Business Profile + reviews + referral program is enough for most cleaning companies to stay fully booked.</p>`,
  },
  {
    title: 'Why Every Cleaning Business Needs a CRM (And What to Look For)',
    slug: 'why-cleaning-businesses-need-crm',
    excerpt: 'Still managing clients in spreadsheets and text messages? A CRM built for cleaning businesses saves hours per week and prevents costly mistakes.',
    metaTitle: 'Why Cleaning Businesses Need a CRM (2026 Guide)',
    metaDescription: 'Learn why a CRM is essential for cleaning businesses. Discover the key features to look for and how the right software saves hours per week and reduces no-shows.',
    content: `<h2>The Spreadsheet Ceiling</h2>
<p>Every cleaning business starts with simple tools. The breaking point happens around 30–40 recurring clients when you start double-booking, forgetting preferences, chasing payments, and losing leads.</p>

<h2>What a CRM Does for Cleaning Businesses</h2>
<ul>
<li><strong>Client profiles:</strong> Contact info, address, preferences, payment history — all in one place.</li>
<li><strong>Scheduling:</strong> Recurring bookings, team assignments, route planning, automatic reminders.</li>
<li><strong>Invoicing:</strong> Automatic invoice generation, payment tracking, overdue alerts.</li>
<li><strong>Communication:</strong> Templates for confirmations, reminders, review requests.</li>
<li><strong>Team management:</strong> Clock-in/out, job assignments, performance visibility.</li>
</ul>

<h2>Hours Saved Per Week</h2>
<ul>
<li>Scheduling: 3–5 hours saved</li>
<li>Reminders and confirmations: 2–3 hours saved</li>
<li>Invoicing and payment follow-up: 2–4 hours saved</li>
<li>Looking up client info: 1–2 hours saved</li>
</ul>
<p>That's 8–14 hours/week back for cleaning, marketing, or having a life.</p>

<h2>What to Look For</h2>
<ul>
<li>Built for home services (not generic sales pipelines)</li>
<li>Online booking for clients</li>
<li>Automated text/email reminders</li>
<li>Team scheduling and daily routes</li>
<li>Payment processing</li>
<li>Mobile-friendly for cleaners</li>
<li>Affordable pricing</li>
</ul>

<h2>The ROI Is Real</h2>
<p>A CRM at $20–$50/month pays for itself: one prevented double-booking saves a $200 refund, automated reviews generate leads worth hundreds/month, and 8+ hours saved per week adds up fast.</p>`,
  },
  {
    title: 'Recurring vs. One-Time Cleaning: How to Build Predictable Revenue',
    slug: 'recurring-vs-one-time-cleaning-revenue',
    excerpt: 'One-time cleanings fill gaps, but recurring clients build wealth. Here\'s how to convert one-timers into long-term recurring revenue.',
    metaTitle: 'Recurring vs One-Time Cleaning: Build Predictable Revenue',
    metaDescription: 'Learn why recurring cleaning clients are 5x more valuable than one-time jobs. Strategies to convert one-time clients into recurring revenue for your cleaning business.',
    content: `<h2>The Feast-or-Famine Trap</h2>
<p>If most of your revenue comes from one-time cleans, you're stuck hustling for new clients constantly. Recurring clients are the foundation of every successful cleaning business.</p>

<h2>The Math: Why Recurring Wins</h2>
<ul>
<li><strong>One-time deep clean:</strong> $300. Lifetime value: $300.</li>
<li><strong>Bi-weekly recurring:</strong> $170 × 26/year = $4,420/year. Over 3 years: <strong>$13,260</strong>.</li>
</ul>
<p>One recurring client is worth 44 one-time clients.</p>

<h2>How to Convert One-Time to Recurring</h2>
<ol>
<li><strong>Make the offer immediately:</strong> While they're standing in their sparkling home: "Would you like to keep it this way? Bi-weekly clients save 10%."</li>
<li><strong>Show the savings:</strong> Present recurring vs. one-time pricing side by side.</li>
<li><strong>Reduce friction:</strong> Set up autopay. The default is "your next clean is already scheduled."</li>
<li><strong>Follow up:</strong> Text 3 days after a one-time clean: "How's the house looking? Ready for our recurring schedule?"</li>
</ol>

<h2>Pricing That Incentivizes Recurring</h2>
<ul>
<li>One-time: $250</li>
<li>Monthly: $210</li>
<li>Bi-weekly: $175</li>
<li>Weekly: $150</li>
</ul>
<p>Weekly clients pay the lowest per-clean rate but generate the most monthly revenue. Bi-weekly is the sweet spot for most residential clients.</p>

<h2>Reducing Churn</h2>
<ul>
<li><strong>Consistency:</strong> Send the same team every time.</li>
<li><strong>Communication:</strong> Send reminders before each visit. Notify about schedule changes.</li>
<li><strong>Quality checks:</strong> Periodically ask for feedback before complaints arise.</li>
<li><strong>Holiday touches:</strong> A small gift or card costs $5 and buys enormous goodwill.</li>
</ul>
<p>A well-run cleaning business should have monthly churn under 3%. That's 97% of clients staying month after month — and that's the power of predictable revenue.</p>`,
  },
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const post of posts) {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: post.slug },
      });

      if (existing) {
        skipped.push(post.slug);
        continue;
      }

      await prisma.blogPost.create({
        data: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          authorId: session.user.id,
          published: true,
          publishedAt: new Date(),
        },
      });

      created.push(post.slug);
    }

    return NextResponse.json({
      success: true,
      data: { created: created.length, skipped: skipped.length, slugs: created },
    });
  } catch (error) {
    console.error('Seed blog posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed blog posts' },
      { status: 500 }
    );
  }
}
