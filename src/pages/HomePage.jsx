import React, { useState, useEffect } from 'react';
import { ClassCard } from '../components/ClassCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import {
  Zap,
  Sparkles,
  Dumbbell,
  CheckCircle2,
  Users,
  Calendar,
  Star,
  Search,
  ArrowRight,
  Flame,
  ShieldCheck,
  Award
} from 'lucide-react';

export const HomePage = ({ onSelectClass, onNavigate }) => {
  const { user } = useAuth();
  const { seatUpdates } = useRealtime();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Fetch classes from backend API
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Failed to fetch class catalog');
      const data = await res.json();
      setClasses(data.classes || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load classes from server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI Recommendations
  const fetchAiRecommendations = async () => {
    const token = localStorage.getItem('curefit_token');
    if (!token) return;

    try {
      setIsAiLoading(true);
      const res = await fetch('/api/classes/ai/recommendations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.warn('AI recommendations load error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchAiRecommendations();
  }, [user]);

  const categories = ['All', 'Dance', 'Strength', 'Yoga', 'Boxing', 'Pilates', 'HIIT'];

  // Filtered classes
  const filteredClasses = classes.filter((c) => {
    const matchesCategory = selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.coach.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const scrollToClasses = () => {
    const elem = document.getElementById('popular-classes');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full pb-16 bg-[#090D0A]">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pb-20 bg-gradient-to-b from-[#0F1611] to-[#090D0A] border-b border-[#1C271F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Live & On-Demand Badge */}
              <div className="inline-flex items-center space-x-2 bg-[#00F076]/15 border border-[#00F076]/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#00F076]">
                <Zap className="w-3.5 h-3.5 text-[#00F076] fill-[#00F076]" />
                <span className="tracking-wider text-[11px] uppercase font-bold">LIVE & ON-DEMAND</span>
              </div>

              {/* Display Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.12]">
                Transform Your <span className="italic font-serif text-[#00F076]">Fitness</span> Journey
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#9AA8A0] max-w-xl leading-relaxed">
                Book live classes, track progress, and join a community of 50,000+ members. Choose from dance, yoga, boxing, and high-intensity strength programs coached by experts.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={scrollToClasses}
                  className="bg-[#00F076] hover:bg-[#00E06D] text-black font-extrabold px-7 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,118,0.25)] hover:shadow-[0_0_25px_rgba(0,240,118,0.4)] text-sm tracking-wide cursor-pointer"
                >
                  EXPLORE CLASSES
                </button>
                <button
                  onClick={() => setShowMembershipModal(true)}
                  className="bg-[#131A15] hover:bg-[#1A231C] text-white border border-[#223227] font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm tracking-wide cursor-pointer"
                >
                  VIEW MEMBERSHIPS
                </button>
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-[#1F2B22] shadow-2xl bg-[#121814]">
                <img
                  src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&auto=format&fit=crop&q=80"
                  alt="CureFit Studio Weight Rack"
                  referrerPolicy="no-referrer"
                  className="w-full h-[290px] sm:h-[350px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D0A] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white bg-[#0A0E0B]/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                  <span className="flex items-center text-white font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#00F076] mr-2 animate-pulse" />
                    12 Centers Active Live
                  </span>
                  <span className="text-[#9AA8A0] font-mono text-[11px]">Air-Purified Studios</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-12">
            {/* Card 1 */}
            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-6 hover:border-[#00F076]/40 transition-all shadow-lg">
              <div className="text-3xl sm:text-4xl font-serif font-extrabold text-[#00F076] mb-1 tracking-tight">
                50K+
              </div>
              <p className="text-xs text-[#8A9A90] font-medium">
                Active Members across 12 major centers
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-6 hover:border-[#00F076]/40 transition-all shadow-lg">
              <div className="text-3xl sm:text-4xl font-serif font-extrabold text-[#00F076] mb-1 tracking-tight">
                200+
              </div>
              <p className="text-xs text-[#8A9A90] font-medium">
                Classes weekly, live-streamed & on-demand
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-6 hover:border-[#00F076]/40 transition-all shadow-lg">
              <div className="text-3xl sm:text-4xl font-serif font-extrabold text-[#00F076] mb-1 tracking-tight flex items-center">
                4.8 <Star className="w-6 h-6 ml-2 fill-[#00F076] text-[#00F076] inline" />
              </div>
              <p className="text-xs text-[#8A9A90] font-medium">
                Average rating from 120,000+ reviews
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AI PERSONALIZED RECOMMENDATIONS (Dynamic Live Card) */}
      {user && aiRecommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="bg-[#121814] border border-[#1F2B22] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#00F076]/15 border border-[#00F076]/30 flex items-center justify-center text-[#00F076]">
                  <Sparkles className="w-5 h-5 text-[#00F076]" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                    AI Coach Recommendations for {user.name}
                    <span className="bg-[#00F076]/20 text-[#00F076] text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold border border-[#00F076]/40">
                      Goal: {user.fitnessGoal || 'Strength'}
                    </span>
                  </h3>
                  <p className="text-xs text-[#8A9A90]">
                    Calculated by Gemini AI based on your calorie burn history & workout frequency.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchAiRecommendations}
                className="text-xs text-[#00F076] font-bold hover:text-white bg-[#161F1A] hover:bg-[#1D2922] px-4 py-2 rounded-lg border border-[#223227] flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
              >
                <span>⚡ Refresh AI Insights</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiRecommendations.map((rec, i) => (
                <div
                  key={rec.classId || i}
                  onClick={() => onSelectClass(rec.classId)}
                  className="bg-[#161F1A] hover:bg-[#1C2721] border border-[#223227] hover:border-[#00F076]/50 p-4 rounded-xl cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-white">{rec.title}</span>
                    <span className="text-xs font-mono font-bold text-[#00F076] bg-[#00F076]/15 px-2 py-0.5 rounded border border-[#00F076]/30">
                      {rec.matchScore}% Match
                    </span>
                  </div>
                  <p className="text-xs text-[#8A9A90] line-clamp-2 leading-relaxed">
                    {rec.reason}
                  </p>
                  <div className="text-[11px] font-semibold text-[#00F076] flex items-center pt-1">
                    <span>Book Recommended Slot</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. POPULAR THIS WEEK */}
      <section id="popular-classes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Popular This Week
            </h2>
            <p className="text-xs text-[#8A9A90] mt-0.5">
              Live capacity and seat reservations updated across all centers in real-time.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#8A9A90] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search classes or coaches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131A15] border border-[#1F2B22] focus:border-[#00F076] focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#8A9A90] transition-colors"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#00F076] text-black font-extrabold shadow-[0_0_12px_rgba(0,240,118,0.3)]'
                  : 'bg-[#131A15] text-[#9AA8A0] hover:text-white hover:bg-[#18221C] border border-[#1F2B22]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-[#121814] border border-[#1F2B22] rounded-2xl h-64 animate-pulse p-4 space-y-4">
                <div className="w-full h-36 bg-[#1A241F] rounded-xl" />
                <div className="h-4 bg-[#1A241F] rounded w-3/4" />
                <div className="h-3 bg-[#1A241F] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-900/60 p-6 rounded-2xl text-center space-y-3">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={fetchClasses}
              className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white text-xs rounded-lg font-semibold"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-[#121814] border border-[#1F2B22] p-12 rounded-2xl text-center space-y-3">
            <Dumbbell className="w-12 h-12 text-[#8A9A90] mx-auto" />
            <h4 className="text-base font-serif font-bold text-white">No classes matched your filter</h4>
            <p className="text-xs text-[#8A9A90]">Try changing the category or searching for another workout.</p>
            <button
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="text-xs text-[#00F076] font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredClasses.map((item) => (
              <ClassCard
                key={item.id}
                fitnessClass={item}
                onSelect={onSelectClass}
              />
            ))}
          </div>
        )}
      </section>

      {/* Membership Modal */}
      {showMembershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#121814] border border-[#223227] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowMembershipModal(false)}
              className="absolute top-4 right-4 text-[#8A9A90] hover:text-white p-1.5 bg-[#1A241F] border border-[#223227] rounded-lg cursor-pointer"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-[#00F076] uppercase tracking-wider">CureFit Passes</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">Unlimited Fitness Memberships</h3>
              <p className="text-xs text-[#8A9A90] mt-1">Access 12+ luxury centers, all formats, and certified coaching.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pro Plan */}
              <div className="bg-[#161F1A] border-2 border-[#00F076] rounded-2xl p-5 relative shadow-[0_0_20px_rgba(0,240,118,0.15)]">
                <span className="absolute -top-3 right-4 bg-[#00F076] text-black font-extrabold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider">
                  MOST POPULAR
                </span>
                <h4 className="font-serif font-bold text-lg text-white">CureFit PRO</h4>
                <div className="text-2xl font-serif font-extrabold text-[#00F076] my-2">₹ 2,499 <span className="text-xs text-[#8A9A90] font-normal font-sans">/ month</span></div>
                <ul className="text-xs text-[#D1DDD5] space-y-2 mb-6">
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> Unlimited Center Access</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> All HRX, Dance & Boxing Formats</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> 2 Free Guest Passes / month</li>
                </ul>
                <button
                  onClick={() => setShowMembershipModal(false)}
                  className="w-full bg-[#00F076] hover:bg-[#00E06D] text-black font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Get Pro Pass
                </button>
              </div>

              {/* Elite Plan */}
              <div className="bg-[#161F1A] border border-[#223227] rounded-2xl p-5">
                <h4 className="font-serif font-bold text-lg text-white">CureFit ELITE</h4>
                <div className="text-2xl font-serif font-extrabold text-white my-2">₹ 3,999 <span className="text-xs text-[#8A9A90] font-normal font-sans">/ month</span></div>
                <ul className="text-xs text-[#D1DDD5] space-y-2 mb-6">
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> All Pro Benefits Included</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> 1-on-1 Personal Trainer Consultation</li>
                  <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#00F076] mr-2 shrink-0" /> Priority Slot Booking (7 days ahead)</li>
                </ul>
                <button
                  onClick={() => setShowMembershipModal(false)}
                  className="w-full bg-[#1A241F] hover:bg-[#222E28] text-white border border-[#223227] font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Get Elite Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
