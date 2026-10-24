import { Router } from 'express';

const router = Router();

// Public, general wellness content. No personal health information is collected.
const tips = [
  {
    id: 'hydration',
    category: 'Daily habits',
    icon: '💧',
    title: 'Make hydration part of your day',
    description:
      'Keep water nearby and drink regularly. Your fluid needs can vary with weather, activity, and health conditions.',
    sourceName: 'NHS',
    sourceUrl: 'https://www.nhs.uk/Live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/',
    sourceCheckedOn: '2026-10-06',
  },
  {
    id: 'movement',
    category: 'Movement',
    icon: '🚶',
    title: 'Add movement in ways that work for you',
    description:
      'Short walks or gentle stretching can help break up long periods of sitting. Choose activities that feel safe for you.',
    sourceName: 'WHO',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    sourceCheckedOn: '2026-10-06',
  },
  {
    id: 'rest',
    category: 'Rest',
    icon: '🌙',
    title: 'Build a relaxing bedtime routine',
    description:
      'A consistent wind-down routine may help you prepare for sleep. Try a quiet activity and a regular bedtime.',
    sourceName: 'CDC',
    sourceUrl: 'https://www.cdc.gov/sleep/about/index.html',
    sourceCheckedOn: '2026-10-06',
  },
  {
    id: 'food',
    category: 'Food',
    icon: '🥗',
    title: 'Aim for variety in meals',
    description:
      'When available, include a mix of vegetables, fruits, grains, and protein sources that suit your needs and preferences.',
    sourceName: 'WHO',
    sourceUrl: 'https://www.who.int/en/news-room/fact-sheets/detail/healthy-diet',
    sourceCheckedOn: '2026-10-06',
  },
  {
    id: 'wellbeing',
    category: 'Wellbeing',
    icon: '🧘',
    title: 'Take a moment to check in with yourself',
    description:
      'A few slow breaths or a brief pause may help you notice how you are feeling and what support you need.',
    sourceName: 'WHO',
    sourceUrl: 'https://www.who.int/publications-detail-redirect/9789240003927',
    sourceCheckedOn: '2026-10-06',
  },
  {
    id: 'prevention',
    category: 'Prevention',
    icon: '🩺',
    title: 'Keep up with routine care',
    description:
      'Ask a qualified healthcare professional which checkups or preventive services are appropriate for you.',
    sourceName: 'MoHFW India',
    sourceUrl: 'https://www.mohfw.gov.in/sites/default/files/Operational%20Guidelines%20on%20Prevention%2C%20Screening%20and%20Control%20of%20Common%20NCDs_1.pdf',
    sourceCheckedOn: '2026-10-06',
  },
];

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ tips });
});

export default router;
