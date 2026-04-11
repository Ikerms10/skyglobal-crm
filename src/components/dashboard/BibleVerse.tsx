'use client'

const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9" },
  { text: "Commit to the Lord whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
  { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { text: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14" },
  { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6" },
  { text: "Give, and it will be given to you. A good measure, pressed down, shaken together and running over.", ref: "Luke 6:38" },
  { text: "No weapon forged against you will prevail.", ref: "Isaiah 54:17" },
  { text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.", ref: "Matthew 6:33" },
  { text: "The blessing of the Lord brings wealth, without painful toil for it.", ref: "Proverbs 10:22" },
  { text: "Delight yourself in the Lord, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
  { text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.", ref: "Matthew 7:7" },
  { text: "With man this is impossible, but with God all things are possible.", ref: "Matthew 19:26" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves.", ref: "Zephaniah 3:17" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "Cast your cares on the Lord and he will sustain you.", ref: "Psalm 55:22" },
  { text: "Whoever sows sparingly will also reap sparingly, and whoever sows generously will also reap generously.", ref: "2 Corinthians 9:6" },
  { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", ref: "Numbers 6:24-25" },
  { text: "Now to him who is able to do immeasurably more than all we ask or imagine.", ref: "Ephesians 3:20" },
  { text: "The heart of man plans his way, but the Lord establishes his steps.", ref: "Proverbs 16:9" },
  { text: "If God is for us, who can be against us?", ref: "Romans 8:31" },
  { text: "Be still and know that I am God.", ref: "Psalm 46:10" },
  { text: "Let your light shine before others, that they may see your good deeds.", ref: "Matthew 5:16" },
  { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
  { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18" },
  { text: "I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit.", ref: "John 15:5" },
  { text: "For where two or three gather in my name, there am I with them.", ref: "Matthew 18:20" },
]

function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

export function BibleVerse() {
  const verse = VERSES[getDayOfYear() % VERSES.length]

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(230,171,53,0.08) 0%, rgba(230,171,53,0.04) 50%, rgba(53,131,179,0.04) 100%)',
        border: '1px solid rgba(230,171,53,0.2)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Decorative quote mark */}
        <span style={{
          fontSize: 72,
          color: 'rgba(230,171,53,0.2)',
          fontFamily: 'Georgia, serif',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: -8,
          userSelect: 'none',
        }}>
          "
        </span>

        {/* Verse content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 16,
            fontStyle: 'italic',
            color: 'var(--text-primary)',
            lineHeight: 1.7,
            fontWeight: 400,
            margin: 0,
          }}>
            {verse.text}
          </p>
          <p style={{
            marginTop: 10,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.02em',
          }}>
            — {verse.ref}
          </p>
        </div>

        {/* Right decoration */}
        <div style={{ flexShrink: 0, textAlign: 'center', paddingLeft: 8 }}>
          <div style={{ fontSize: 28, opacity: 0.4, color: 'var(--gold)', lineHeight: 1 }}>✝</div>
          <p style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-tertiary)',
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}>
            Daily Verse
          </p>
        </div>
      </div>
    </div>
  )
}
