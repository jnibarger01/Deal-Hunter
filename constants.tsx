
import { Deal, Marketplace, Category } from './types';

export const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    title: 'Sony X90L 65" 4K Google TV - Screen flickers',
    price: 350,
    marketValue: 950,
    marketplace: Marketplace.FACEBOOK,
    category: Category.TVS,
    imageUrl: 'https://picsum.photos/seed/sony-tv/600/400',
    location: 'Austin, TX (5 miles)',
    postedAt: '12 mins ago',
    description: 'TV works but screen flickers occasionally. Might be a loose cable or T-CON board issue. Moving soon, need it gone.',
    dealScore: 91,
    estimatedProfit: 420,
    condition: 'Fair',
    soldListings: [
      {
        listingId: 'tv-sold-1',
        itemPrice: 900,
        shippingCost: 40,
        soldDate: '2024-12-22T18:30:00Z',
        rawCondition: 'Used - Good',
        title: 'Sony X90L 65" 4K Google TV',
        category: 'TVs & Speakers'
      },
      {
        listingId: 'tv-sold-2',
        itemPrice: 875,
        shippingCost: 35,
        soldDate: '2024-12-18T13:10:00Z',
        rawCondition: 'Used',
        title: 'Sony X90L 65" 4K TV',
        category: 'TVs & Speakers'
      },
      {
        listingId: 'tv-sold-3',
        itemPrice: 920,
        shippingCost: 45,
        soldDate: '2024-12-10T20:05:00Z',
        rawCondition: 'Used - Like New',
        title: 'Sony X90L 65 inch 4K',
        category: 'TVs & Speakers'
      },
      {
        listingId: 'tv-sold-4',
        itemPrice: 860,
        shippingCost: 30,
        soldDate: '2024-11-28T09:40:00Z',
        rawCondition: 'Used - Good',
        title: 'Sony X90L 65" Smart TV',
        category: 'TVs & Speakers'
      },
      {
        listingId: 'tv-sold-5',
        itemPrice: 940,
        shippingCost: 50,
        soldDate: '2024-11-22T16:15:00Z',
        rawCondition: 'Used',
        title: 'Sony X90L 65" 4K UHD',
        category: 'TVs & Speakers'
      },
      {
        listingId: 'tv-sold-6',
        itemPrice: 890,
        shippingCost: 38,
        soldDate: '2024-11-05T11:55:00Z',
        rawCondition: 'Used - Good',
        title: 'Sony X90L 65" Google TV',
        category: 'TVs & Speakers'
      }
    ]
  },
  {
    id: '2',
    title: 'Milwaukee M18 Fuel Impact Driver Kit - Brand New',
    price: 120,
    marketValue: 240,
    marketplace: Marketplace.CRAIGSLIST,
    category: Category.TOOLS,
    imageUrl: 'https://picsum.photos/seed/milwaukee/600/400',
    location: 'Georgetown, TX (22 miles)',
    postedAt: '2 hours ago',
    description: 'Won at a company raffle. Never used. Includes battery and charger.',
    dealScore: 88,
    estimatedProfit: 100,
    condition: 'New',
    soldListings: [
      {
        listingId: 'tool-sold-1',
        itemPrice: 210,
        shippingCost: 18,
        soldDate: '2024-12-20T10:20:00Z',
        rawCondition: 'New',
        title: 'Milwaukee M18 Fuel Impact Driver Kit',
        category: 'Tools'
      },
      {
        listingId: 'tool-sold-2',
        itemPrice: 195,
        shippingCost: 15,
        soldDate: '2024-12-15T08:40:00Z',
        rawCondition: 'New',
        title: 'Milwaukee M18 Fuel Impact Driver + Battery',
        category: 'Tools'
      },
      {
        listingId: 'tool-sold-3',
        itemPrice: 205,
        shippingCost: 20,
        soldDate: '2024-12-07T19:05:00Z',
        rawCondition: 'New with tags',
        title: 'Milwaukee M18 Fuel 2853-20 Kit',
        category: 'Tools'
      },
      {
        listingId: 'tool-sold-4',
        itemPrice: 185,
        shippingCost: 12,
        soldDate: '2024-11-29T12:00:00Z',
        rawCondition: 'New',
        title: 'Milwaukee M18 Fuel Impact Driver Set',
        category: 'Tools'
      },
      {
        listingId: 'tool-sold-5',
        itemPrice: 220,
        shippingCost: 22,
        soldDate: '2024-11-18T14:30:00Z',
        rawCondition: 'New',
        title: 'Milwaukee M18 Fuel Impact Driver Kit',
        category: 'Tools'
      },
      {
        listingId: 'tool-sold-6',
        itemPrice: 200,
        shippingCost: 16,
        soldDate: '2024-11-03T09:10:00Z',
        rawCondition: 'New',
        title: 'Milwaukee M18 Fuel Impact Driver',
        category: 'Tools'
      }
    ]
  },
  {
    id: '3',
    title: '2015 Toyota Tacoma Head Unit / Stereo',
    price: 50,
    marketValue: 200,
    marketplace: Marketplace.EBAY,
    category: Category.AUTOMOTIVE,
    imageUrl: 'https://picsum.photos/seed/tacoma/600/400',
    location: 'Ships from CA',
    postedAt: '45 mins ago',
    description: 'Pulled from my 2015 Tacoma when I upgraded to Carplay. Fully functional.',
    dealScore: 85,
    estimatedProfit: 130,
    condition: 'Good'
  },
  {
    id: '4',
    title: 'Nikon Z6 II Body Only - Low shutter count',
    price: 900,
    marketValue: 1400,
    marketplace: Marketplace.FACEBOOK,
    category: Category.TECH,
    imageUrl: 'https://picsum.photos/seed/nikon/600/400',
    location: 'Round Rock, TX (12 miles)',
    postedAt: '1 hour ago',
    description: 'Switching to Sony. Camera is in mint condition. Includes 2 batteries.',
    dealScore: 94,
    estimatedProfit: 450,
    condition: 'Excellent'
  },
  {
    id: '5',
    title: 'PS5 Digital Edition - Disc drive making noise',
    price: 200,
    marketValue: 380,
    marketplace: Marketplace.CRAIGSLIST,
    category: Category.GAMING,
    imageUrl: 'https://picsum.photos/seed/ps5/600/400',
    location: 'Austin, TX (2 miles)',
    postedAt: '3 hours ago',
    description: 'The console works fine but there is a clicking sound. Selling as-is for parts or repair.',
    dealScore: 82,
    estimatedProfit: 150,
    condition: 'Poor'
  },
  {
    id: '6',
    title: 'JBL Bar 9.1 Soundbar System',
    price: 450,
    marketValue: 800,
    marketplace: Marketplace.FACEBOOK,
    category: Category.TVS,
    imageUrl: 'https://picsum.photos/seed/jbl/600/400',
    location: 'Cedar Park, TX (18 miles)',
    postedAt: '5 mins ago',
    description: 'Great condition, just moved and it doesn\'t fit the new living room. Subwoofer included.',
    dealScore: 89,
    estimatedProfit: 300,
    condition: 'Good'
  }
];
