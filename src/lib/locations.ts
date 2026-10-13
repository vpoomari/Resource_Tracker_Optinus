// Global cities list — used as <datalist> suggestions for location inputs.
// Designed to cover all major regions: North America, Europe, Asia-Pacific,
// Middle East, Africa, Latin America. Format is "City, Country".
//
// The location field is always free-text — users can type any city in any country.
// This list just provides convenient autocomplete suggestions.

export const GLOBAL_CITIES: string[] = [
  // ─── North America ──────────────────────────────────────
  "New York, USA", "San Francisco, USA", "Los Angeles, USA", "Chicago, USA", "Boston, USA",
  "Seattle, USA", "Austin, USA", "Dallas, USA", "Atlanta, USA", "Denver, USA",
  "Washington, USA", "Miami, USA", "Toronto, Canada", "Vancouver, Canada", "Montreal, Canada",
  "Ottawa, Canada", "Calgary, Canada", "Mexico City, Mexico", "Guadalajara, Mexico",

  // ─── South America ───────────────────────────────────────
  "São Paulo, Brazil", "Rio de Janeiro, Brazil", "Brasília, Brazil",
  "Buenos Aires, Argentina", "Santiago, Chile", "Lima, Peru", "Bogotá, Colombia",
  "Medellín, Colombia", "Quito, Ecuador", "Montevideo, Uruguay",

  // ─── Europe ──────────────────────────────────────────────
  "London, UK", "Manchester, UK", "Edinburgh, UK", "Dublin, Ireland",
  "Paris, France", "Lyon, France", "Berlin, Germany", "Munich, Germany", "Frankfurt, Germany",
  "Hamburg, Germany", "Amsterdam, Netherlands", "Rotterdam, Netherlands",
  "Brussels, Belgium", "Luxembourg, Luxembourg",
  "Madrid, Spain", "Barcelona, Spain", "Lisbon, Portugal",
  "Rome, Italy", "Milan, Italy", "Turin, Italy",
  "Zurich, Switzerland", "Geneva, Switzerland", "Basel, Switzerland",
  "Vienna, Austria", "Stockholm, Sweden", "Gothenburg, Sweden",
  "Copenhagen, Denmark", "Helsinki, Finland", "Oslo, Norway",
  "Warsaw, Poland", "Kraków, Poland", "Prague, Czech Republic",
  "Budapest, Hungary", "Bucharest, Romania", "Sofia, Bulgaria",
  "Athens, Greece", "Larnaca, Cyprus", "Reykjavik, Iceland",

  // ─── Middle East ─────────────────────────────────────────
  "Dubai, UAE", "Abu Dhabi, UAE", "Sharjah, UAE",
  "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Dammam, Saudi Arabia",
  "Doha, Qatar", "Manama, Bahrain", "Kuwait City, Kuwait",
  "Muscat, Oman", "Amman, Jordan", "Beirut, Lebanon",
  "Jerusalem, Israel", "Tel Aviv, Israel", "Haifa, Israel",
  "Istanbul, Turkey", "Ankara, Turkey", "Izmir, Turkey",

  // ─── India (extensive coverage) ──────────────────────────
  "Bangalore, India", "Bengaluru, India", "Mumbai, India", "Delhi, India", "New Delhi, India",
  "Hyderabad, India", "Pune, India", "Chennai, India", "Kolkata, India",
  "Gurgaon, India", "Gurugram, India", "Noida, India", "Greater Noida, India",
  "Ahmedabad, India", "Gandhinagar, India", "Jaipur, India", "Lucknow, India",
  "Kanpur, India", "Nagpur, India", "Indore, India", "Bhopal, India",
  "Patna, India", "Surat, India", "Vadodara, India", "Rajkot, India",
  "Coimbatore, India", "Madurai, India", "Kochi, India", "Trivandrum, India",
  "Thiruvananthapuram, India", "Kozhikode, India", "Mysuru, India", "Mysore, India",
  "Mangalore, India", "Visakhapatnam, India", "Vijayawada, India", "Tirupati, India",
  "Bhubaneswar, India", "Cuttack, India", "Ranchi, India", "Jamshedpur, India",
  "Raipur, India", "Bhilai, India", "Dehradun, India", "Haridwar, India",
  "Chandigarh, India", "Mohali, India", "Ludhiana, India", "Amritsar, India",
  "Jalandhar, India", "Jammu, India", "Srinagar, India", "Shimla, India",
  "Guwahati, India", "Shillong, India", "Agartala, India", "Imphal, India",
  "Gangtok, India", "Itanagar, India", "Aizawl, India", "Kohima, India",
  "Pondicherry, India", "Silvassa, India", "Daman, India", "Panaji, India",
  "Port Blair, India", "Bilaspur, India", "Durg, India",

  // ─── Other Asia-Pacific ──────────────────────────────────
  "Singapore, Singapore", "Hong Kong, China", "Shanghai, China", "Beijing, China",
  "Shenzhen, China", "Guangzhou, China", "Chengdu, China", "Hangzhou, China",
  "Tokyo, Japan", "Osaka, Japan", "Yokohama, Japan", "Nagoya, Japan",
  "Seoul, South Korea", "Busan, South Korea", "Incheon, South Korea",
  "Taipei, Taiwan", "Kaohsiung, Taiwan", "Manila, Philippines", "Cebu, Philippines",
  "Kuala Lumpur, Malaysia", "Penang, Malaysia", "Johor Bahru, Malaysia",
  "Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand",
  "Jakarta, Indonesia", "Surabaya, Indonesia", "Bandung, Indonesia",
  "Ho Chi Minh City, Vietnam", "Hanoi, Vietnam", "Da Nang, Vietnam",
  "Phnom Penh, Cambodia", "Vientiane, Laos", "Yangon, Myanmar", "Naypyidaw, Myanmar",
  "Colombo, Sri Lanka", "Dhaka, Bangladesh", "Chittagong, Bangladesh",
  "Kathmandu, Nepal", "Pokhara, Nepal", "Thimphu, Bhutan",
  "Karachi, Pakistan", "Lahore, Pakistan", "Islamabad, Pakistan",
  "Male, Maldives",

  // ─── Africa ──────────────────────────────────────────────
  "Johannesburg, South Africa", "Cape Town, South Africa", "Durban, South Africa",
  "Pretoria, South Africa", "Cairo, Egypt", "Alexandria, Egypt", "Giza, Egypt",
  "Nairobi, Kenya", "Mombasa, Kenya", "Dar es Salaam, Tanzania", "Arusha, Tanzania",
  "Kampala, Uganda", "Addis Ababa, Ethiopia", "Lagos, Nigeria", "Abuja, Nigeria",
  "Accra, Ghana", "Dakar, Senegal", "Casablanca, Morocco", "Rabat, Morocco",
  "Tunis, Tunisia", "Algiers, Algeria", "Luanda, Angola", "Maputo, Mozambique",
  "Kigali, Rwanda", "Harare, Zimbabwe", "Lusaka, Zambia",

  // ─── Oceania ─────────────────────────────────────────────
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia",
  "Perth, Australia", "Adelaide, Australia", "Canberra, Australia",
  "Auckland, New Zealand", "Wellington, New Zealand", "Christchurch, New Zealand",
  "Suva, Fiji",
];
