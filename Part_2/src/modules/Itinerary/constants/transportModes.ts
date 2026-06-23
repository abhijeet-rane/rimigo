/**
 * Canonical list of transport modes a traveler can attach to a slot.
 *
 * The dropdown in AddEventModal sources its options from this file.
 * Backend compatibility contract:
 *   - ``label`` is stored verbatim as ``slot_data.mode`` (the label the
 *     traveler sees on the route strip).
 *   - ``kind`` is stored as ``slot.kind`` and must be one of the values
 *     in ``trip.constants.itinerary_slot_constants.TRANSPORT_SLOT_KINDS``
 *     so the route-summary builder picks the slot up.
 *   - ``aliases`` power the searchable dropdown — type "tube" or "subway"
 *     to find "London Underground / Tube".
 *
 * Icons are lucide-react component names; the dropdown resolves them
 * to React components via ``TRANSPORT_ICONS``.
 */
import {
    Anchor,
    Bike,
    Bus,
    CableCar,
    Car,
    CarTaxiFront,
    Compass,
    Footprints,
    MountainSnow,
    Plane,
    Sailboat,
    Ship,
    Snowflake,
    TrainFront,
    TrainTrack,
    TramFront,
    Truck,
    Waves,
    Zap,
} from 'lucide-react'

export type TransportCategory =
    | 'Air'
    | 'High-speed rail'
    | 'Long-distance & scenic rail'
    | 'Metro / Urban rapid transit'
    | 'Tram / Streetcar'
    | 'Light metro / special rail'
    | 'Bus'
    | 'Regional / shared bus'
    | 'Taxi / Ride-hail'
    | 'Three-wheelers & motorcycle taxis'
    | 'Car'
    | 'Ferry'
    | 'Boat / Cruise'
    | 'Traditional / small craft'
    | 'Cable / Aerial'
    | 'Human-powered'
    | 'Animal'
    | 'Unique / quirky'

export interface TransportMode {
    /** Stored verbatim on ``slot_data.mode`` — also the display label. */
    label: string
    /** Search aliases (lowercase). Substring + token matched. */
    aliases: string[]
    /** Secondary line shown under the label. */
    hint?: string
    /** Group header in the dropdown. */
    category: TransportCategory
    /** Must be one of backend's ``TRANSPORT_SLOT_KINDS``. */
    kind: string
    /** lucide-react icon component. */
    icon: typeof Plane
}

const m = (
    label: string,
    kind: string,
    category: TransportCategory,
    icon: typeof Plane,
    hint?: string,
    aliases: string[] = [],
): TransportMode => ({ label, kind, category, icon, hint, aliases })

export const TRANSPORT_MODES: TransportMode[] = [
    // ── Air ──────────────────────────────────────────────────────────
    m('Flight', 'flight', 'Air', Plane, 'Commercial airline', ['airline', 'airplane', 'plane']),
    m('Private jet', 'private-jet', 'Air', Plane, 'Executive / business jet', ['jet', 'business jet']),
    m('Charter flight', 'charter-flight', 'Air', Plane, undefined, ['chartered']),
    m('Helicopter', 'helicopter', 'Air', Plane, 'Rotary-wing aircraft', ['chopper', 'heli']),
    m('Seaplane', 'seaplane', 'Air', Plane, 'Water-landing plane', ['floatplane']),
    m('Bush plane', 'flight', 'Air', Plane, 'Remote-access propeller plane', ['prop plane']),
    m('Hot-air balloon', 'flight', 'Air', Plane, 'Montgolfière', ['balloon', 'montgolfiere']),
    m('Paraglider', 'flight', 'Air', Plane, 'Foot-launched glider', ['parasail', 'paragliding']),
    m('Glider', 'flight', 'Air', Plane, 'Sailplane', ['sailplane']),

    // ── High-speed rail ──────────────────────────────────────────────
    m('High-speed train', 'train', 'High-speed rail', TrainFront, 'ICE, AVE, Frecciarossa, Thalys, CRH', ['hsr', 'high speed', 'bullet train']),
    m('Shinkansen', 'train', 'High-speed rail', TrainFront, 'Japan bullet train', ['nozomi', 'hikari', 'kodama', 'bullet']),
    m('TGV', 'train', 'High-speed rail', TrainFront, 'Train à Grande Vitesse (France)', ['france hsr']),
    m('Eurostar', 'train', 'High-speed rail', TrainFront, 'Cross-channel high-speed train', ['channel tunnel', 'paris london']),
    m('KTX', 'train', 'High-speed rail', TrainFront, 'Korea Train Express', ['korea']),
    m('Maglev', 'train', 'High-speed rail', TrainFront, 'Shanghai / Japan Chuo', ['magnetic levitation', 'shanghai maglev']),

    // ── Long-distance & scenic rail ──────────────────────────────────
    m('Intercity train', 'train', 'Long-distance & scenic rail', TrainFront, 'IC / IR services', ['intercity', 'ic', 'ir']),
    m('Amtrak', 'train', 'Long-distance & scenic rail', TrainFront, 'US intercity passenger rail', ['usa', 'america']),
    m('Regional train', 'train', 'Long-distance & scenic rail', TrainFront, 'Regio service', ['regio']),
    m('Sleeper train', 'train', 'Long-distance & scenic rail', TrainFront, 'Overnight rail', ['night train', 'overnight']),
    m('Nightjet', 'train', 'Long-distance & scenic rail', TrainFront, 'European sleeper', ['obb night']),
    m('Caledonian Sleeper', 'train', 'Long-distance & scenic rail', TrainFront, 'UK overnight train', ['scotland sleeper']),
    m('Trans-Siberian', 'train', 'Long-distance & scenic rail', TrainFront, 'Rossiya / Moscow–Vladivostok', ['rossiya', 'siberia']),
    m('The Ghan', 'train', 'Long-distance & scenic rail', TrainFront, 'Adelaide–Darwin', ['australia outback']),
    m('Rocky Mountaineer', 'train', 'Long-distance & scenic rail', TrainFront, 'Canadian Rockies rail', ['canada scenic']),
    m('Venice Simplon-Orient-Express', 'train', 'Long-distance & scenic rail', TrainFront, 'Luxury heritage train', ['orient express', 'luxury']),
    m('Glacier Express', 'train', 'Long-distance & scenic rail', TrainFront, 'Switzerland panoramic', ['swiss alps', 'zermatt']),
    m('Bernina Express', 'train', 'Long-distance & scenic rail', TrainFront, 'Alpine UNESCO route', ['st moritz', 'tirano']),
    m('Heritage / scenic train', 'train', 'Long-distance & scenic rail', TrainFront, 'Narrow-gauge, steam, etc.', ['steam', 'heritage rail', 'tourist train']),
    m('Motorail', 'train', 'Long-distance & scenic rail', TrainFront, 'Car-carrying train', ['auto train', 'autoreisezug']),

    // ── Metro / Urban rapid transit ──────────────────────────────────
    m('Metro / Subway', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Rapid transit (generic)', ['metro', 'subway', 'underground', 'urban rail']),
    m('London Underground / Tube', 'metro', 'Metro / Urban rapid transit', TrainFront, 'The Tube', ['tube', 'london metro']),
    m('Paris Métro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Métropolitain', ['metropolitain', 'paris']),
    m('NYC Subway', 'subway', 'Metro / Urban rapid transit', TrainFront, 'New York City Subway', ['new york', 'mta']),
    m('Tokyo Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Tokyo Metro / Toei Subway', ['tokyo', 'toei']),
    m('MTR', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Hong Kong Mass Transit Railway', ['hong kong']),
    m('BTS Skytrain', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Bangkok elevated metro', ['bangkok sky', 'skytrain']),
    m('Dubai Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Dubai rapid transit', ['dubai']),
    m('BART', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Bay Area Rapid Transit', ['san francisco', 'sf bart']),
    m('U-Bahn', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Germany / Austria underground', ['berlin metro', 'vienna metro']),
    m('S-Bahn', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Germany / Switzerland suburban rapid rail', ['s bahn', 'berlin', 'zurich']),
    m('Moscow Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Ornate Moscow rapid transit', ['moscow']),
    m('Seoul Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Seoul Subway', ['seoul']),
    m('Singapore MRT', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Mass Rapid Transit', ['mrt', 'singapore']),
    m('Madrid Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Madrid underground', ['madrid']),
    m('Shanghai Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'Shanghai rapid transit', ['shanghai']),
    m('Mexico City Metro', 'metro', 'Metro / Urban rapid transit', TrainFront, 'STC Metro', ['stc', 'cdmx', 'mexico df']),
    m('Commuter rail', 'train', 'Metro / Urban rapid transit', TrainFront, 'Suburban regional rail', ['suburban', 'commuter']),
    m('RER', 'train', 'Metro / Urban rapid transit', TrainFront, 'Paris Réseau Express Régional', ['paris suburban']),
    m('Elizabeth line', 'train', 'Metro / Urban rapid transit', TrainFront, 'London suburban express', ['crossrail', 'london']),

    // ── Tram / Streetcar ─────────────────────────────────────────────
    m('Tram / Streetcar', 'tram', 'Tram / Streetcar', TramFront, 'Tramway (generic)', ['tram', 'streetcar', 'trolley', 'tranvía', 'straßenbahn']),
    m('Eléctrico', 'tram', 'Tram / Streetcar', TramFront, 'Lisbon heritage tram', ['lisbon', 'portugal', 'tram 28']),
    m('Ding Ding', 'tram', 'Tram / Streetcar', TramFront, 'Hong Kong double-decker tram', ['hong kong tramways']),
    m('Melbourne tram', 'tram', 'Tram / Streetcar', TramFront, "World's largest tram network", ['melbourne', 'australia']),
    m('Cable car (San Francisco)', 'tram', 'Tram / Streetcar', TramFront, 'Powell–Hyde / California St.', ['sf cable car', 'powell hyde']),

    // ── Light metro / special rail ───────────────────────────────────
    m('Light rail', 'light-rail', 'Light metro / special rail', TrainFront, 'Stadtbahn / LRT', ['lrt', 'stadtbahn']),
    m('Monorail', 'monorail', 'Light metro / special rail', TrainTrack, 'KL, Haneda, Las Vegas, Mumbai', ['mono rail']),
    m('Schwebebahn', 'monorail', 'Light metro / special rail', TrainTrack, 'Suspended monorail (Wuppertal)', ['wuppertal', 'suspended']),
    m('Automated people mover', 'light-rail', 'Light metro / special rail', TrainTrack, 'APM — Yurikamome, Metromover, VAL', ['apm', 'people mover', 'yurikamome']),
    m('Funicular', 'transport', 'Light metro / special rail', TrainTrack, 'Incline railway', ['incline', 'funiculaire', 'standseilbahn']),
    m('Cogwheel railway', 'train', 'Light metro / special rail', TrainTrack, 'Rack railway — Alpine', ['cog', 'rack railway', 'zahnradbahn']),

    // ── Bus ──────────────────────────────────────────────────────────
    m('City bus', 'bus', 'Bus', Bus, 'Public city bus', ['urban bus', 'local bus']),
    m('Double-decker bus', 'bus', 'Bus', Bus, 'Two-level bus', ['double decker']),
    m('Routemaster', 'bus', 'Bus', Bus, 'Iconic London double-decker', ['london bus']),
    m('Trolleybus', 'bus', 'Bus', Bus, 'Electric overhead-wire bus', ['trolley bus']),
    m('Intercity coach', 'coach', 'Bus', Bus, 'Long-distance bus (generic)', ['coach', 'long distance', 'megabus', 'national express']),
    m('Greyhound', 'coach', 'Bus', Bus, 'US intercity coach', ['usa coach']),
    m('FlixBus', 'coach', 'Bus', Bus, 'European low-cost coach', ['europe coach']),
    m('Sleeper bus', 'coach', 'Bus', Bus, 'Overnight bus with berths', ['overnight bus', 'volvo sleeper']),
    m('Airport shuttle', 'shuttle', 'Bus', Bus, 'Point-to-point shuttle', ['shuttle']),
    m('Minibus', 'minibus', 'Bus', Bus, 'Small-capacity bus', ['mini bus']),
    m('Postbus', 'bus', 'Bus', Bus, 'Swiss PostAuto rural network', ['postauto', 'swiss postbus']),
    m('BRT', 'bus', 'Bus', Bus, 'Bus Rapid Transit (generic)', ['rapid bus', 'dedicated lane']),
    m('TransMilenio', 'bus', 'Bus', Bus, 'Bogotá BRT', ['bogota brt']),
    m('TransJakarta', 'bus', 'Bus', Bus, "World's longest BRT network", ['jakarta brt']),
    m('Hop-on hop-off bus', 'bus', 'Bus', Bus, 'Sightseeing tour bus', ['sightseeing', 'tour bus']),

    // ── Regional / shared bus ────────────────────────────────────────
    m('Jeepney', 'minibus', 'Regional / shared bus', Bus, 'Filipino WWII-surplus shared bus', ['philippines', 'jeepnee']),
    m('Matatu', 'minibus', 'Regional / shared bus', Bus, 'Kenya minibus taxi', ['kenya', 'nairobi']),
    m('Dala dala', 'minibus', 'Regional / shared bus', Bus, 'Tanzania shared minibus', ['tanzania', 'zanzibar']),
    m('Tro tro', 'minibus', 'Regional / shared bus', Bus, 'Ghana shared minibus', ['ghana', 'accra']),
    m('Marshrutka', 'minibus', 'Regional / shared bus', Bus, 'Russia / CIS fixed-route minibus', ['russia', 'cis']),
    m('Dolmuş', 'minibus', 'Regional / shared bus', Bus, 'Turkey shared taxi / minibus', ['turkey', 'istanbul dolmus']),
    m('Songthaew', 'minibus', 'Regional / shared bus', Bus, 'Thailand / Laos pickup with benches', ['thailand pickup', 'songtao']),
    m('Chiva', 'bus', 'Regional / shared bus', Bus, 'Latin America open-sided rural bus', ['chicken bus', 'latin america']),
    m('Bemo', 'minibus', 'Regional / shared bus', Bus, 'Indonesia public minibus', ['indonesia minibus']),
    m('Angkot', 'minibus', 'Regional / shared bus', Bus, 'Indonesia urban shared minibus', ['indonesia angkot']),

    // ── Taxi / Ride-hail ─────────────────────────────────────────────
    m('Transfer', 'transfer', 'Taxi / Ride-hail', CarTaxiFront, 'Airport / hotel transfer', ['airport transfer', 'hotel transfer', 'pickup', 'drop-off', 'shuttle transfer']),
    m('Taxi', 'taxi', 'Taxi / Ride-hail', CarTaxiFront, 'Metered taxi', ['cab', 'taxicab']),
    m('Yellow Cab', 'taxi', 'Taxi / Ride-hail', CarTaxiFront, 'NYC medallion taxi', ['nyc taxi', 'new york cab']),
    m('Black cab', 'taxi', 'Taxi / Ride-hail', CarTaxiFront, 'London hackney carriage', ['london cab', 'hackney']),
    m('Limousine', 'taxi', 'Taxi / Ride-hail', CarTaxiFront, 'Chauffeured luxury car', ['limo', 'chauffeur']),
    m('Ride-share', 'ride-hail', 'Taxi / Ride-hail', CarTaxiFront, 'Uber / Lyft / Ola / Didi / Grab / Bolt', ['uber', 'lyft', 'ola', 'didi', 'grab', 'bolt', 'rideshare']),
    m('Shared taxi', 'shared-cab', 'Taxi / Ride-hail', CarTaxiFront, 'Sherut, colectivo, combi', ['sherut', 'colectivo']),

    // ── Three-wheelers & motorcycle taxis ────────────────────────────
    m('Auto-rickshaw', 'auto-rickshaw', 'Three-wheelers & motorcycle taxis', Car, 'Three-wheeler taxi', ['auto', 'rickshaw', 'three wheeler']),
    m('Tuk-tuk', 'tuk-tuk', 'Three-wheelers & motorcycle taxis', Car, 'Thailand / Sri Lanka / Laos three-wheeler', ['tuktuk', 'thailand']),
    m('Bajaj', 'tuk-tuk', 'Three-wheelers & motorcycle taxis', Car, 'Indonesia three-wheeler', ['indonesia tuktuk']),
    m('Mototaxi', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Peru / Brazil three-wheeler or motorbike', ['moto', 'peru']),
    m('Boda boda', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Uganda / Kenya motorcycle taxi', ['uganda', 'kenya moto']),
    m('Ojek / Ojol', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Indonesia motorcycle taxi', ['gojek', 'grabbike']),
    m('Xe ôm', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Vietnam motorcycle taxi', ['xeom', 'vietnam moto']),
    m('Habal-habal', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Philippines motorcycle taxi', ['philippines moto']),
    m('Okada', 'motorbike', 'Three-wheelers & motorcycle taxis', Bike, 'Nigeria motorcycle taxi', ['nigeria moto']),
    m('Pedicab / Cycle rickshaw', 'rickshaw', 'Three-wheelers & motorcycle taxis', Bike, 'Becak, Cyclo, Trishaw', ['becak', 'cyclo', 'trishaw', 'velotaxi']),

    // ── Car ──────────────────────────────────────────────────────────
    m('Private car', 'car', 'Car', Car, 'Private sedan / SUV', ['sedan', 'suv', 'automobile']),
    m('Rental car', 'car-rental', 'Car', Car, 'Self-drive rental', ['hire car', 'car hire']),
    m('Campervan / RV', 'campervan', 'Car', Truck, 'Motorhome', ['rv', 'motorhome', 'caravan']),
    m('Car-share', 'car-rental', 'Car', Car, 'Zipcar, Share Now', ['zipcar', 'sharing']),
    m('Motorcycle / Scooter rental', 'motorbike', 'Car', Bike, 'Motorbike / Vespa hire', ['vespa', 'scooter hire', 'motorbike rental']),

    // ── Ferry ────────────────────────────────────────────────────────
    m('Ferry', 'ferry', 'Ferry', Ship, 'Passenger ferry', ['ferryboat']),
    m('Vehicle ferry', 'ferry', 'Ferry', Ship, 'Roll-on/roll-off (RoRo)', ['roro', 'car ferry']),
    m('Fast ferry / Catamaran', 'ferry', 'Ferry', Ship, 'Twin-hull fast ferry', ['catamaran', 'fast boat']),
    m('Hydrofoil', 'ferry', 'Ferry', Ship, 'Aliscafo', ['aliscafo']),
    m('Hovercraft', 'ferry', 'Ferry', Ship, 'Air-cushion vehicle', ['hover']),
    m('Star Ferry', 'ferry', 'Ferry', Ship, 'Hong Kong harbour ferry', ['hong kong ferry', 'victoria harbour']),

    // ── Boat / Cruise ────────────────────────────────────────────────
    m('Speedboat', 'speedboat', 'Boat / Cruise', Ship, 'Fast boat', ['lancha', 'powerboat']),
    m('Water taxi', 'water-taxi', 'Boat / Cruise', Ship, 'On-demand boat', ['taxi boat', 'khlong boat']),
    m('Abra', 'water-taxi', 'Boat / Cruise', Sailboat, 'Dubai wooden water taxi', ['dubai creek']),
    m('Cruise ship', 'cruise', 'Boat / Cruise', Ship, 'Ocean cruise liner', ['cruise liner', 'ocean cruise']),
    m('River cruise', 'cruise', 'Boat / Cruise', Ship, 'Rhine / Nile / Mekong', ['river boat', 'rhine', 'nile', 'mekong']),
    m('Expedition cruise', 'cruise', 'Boat / Cruise', Ship, 'Antarctica / Galápagos small-ship', ['antarctica', 'galapagos']),
    m('Zodiac / RIB', 'speedboat', 'Boat / Cruise', Ship, 'Rigid inflatable — expedition landings', ['rib', 'zodiac', 'inflatable']),
    m('Yacht', 'boat', 'Boat / Cruise', Sailboat, 'Private sailing vessel', ['sailing yacht']),
    m('Jet ski', 'speedboat', 'Boat / Cruise', Ship, 'Personal watercraft', ['pwc', 'jetski']),
    m('Gondola (Venice)', 'boat', 'Boat / Cruise', Sailboat, 'Rowed Venetian boat', ['venice', 'venetian']),
    m('Vaporetto', 'ferry', 'Boat / Cruise', Ship, 'Venice water bus', ['venice water bus']),
    m('Traghetto', 'ferry', 'Boat / Cruise', Ship, 'Cross-canal Venice gondola ferry', ['venice traghetto']),
    m('Longtail boat', 'boat', 'Boat / Cruise', Sailboat, 'Thailand long-propeller river boat', ['thailand', 'phuket', 'krabi']),
    m('Bangka', 'boat', 'Boat / Cruise', Sailboat, 'Filipino outrigger canoe', ['outrigger', 'philippines boat']),
    m('Sampan', 'boat', 'Boat / Cruise', Sailboat, 'China / SE Asia small boat', ['china boat', 'hong kong']),
    m('Pirogue', 'boat', 'Boat / Cruise', Sailboat, 'West Africa / Louisiana dugout canoe', ['dugout']),
    m('Felucca', 'boat', 'Boat / Cruise', Sailboat, 'Egypt Nile lateen-sail boat', ['egypt', 'nile sail']),
    m('Dhow', 'boat', 'Boat / Cruise', Sailboat, 'Arabian / East African sailing vessel', ['arabian', 'zanzibar', 'oman']),
    m('Junk', 'boat', 'Boat / Cruise', Sailboat, 'Chinese battened-sail ship', ['hong kong junk', 'chinese sail']),

    // ── Traditional / small craft ────────────────────────────────────
    m('Dhoni', 'boat', 'Traditional / small craft', Sailboat, 'Traditional Maldivian boat', ['maldives']),
    m('Narrowboat', 'houseboat', 'Traditional / small craft', Anchor, 'UK canal barge', ['canal barge', 'peniche', 'canal boat']),
    m('Punt', 'boat', 'Traditional / small craft', Sailboat, 'Cambridge / Oxford flat boat', ['cambridge', 'oxford', 'punting']),
    m('Bamboo raft', 'boat', 'Traditional / small craft', Waves, 'River bamboo raft', ['raft', 'bamboo']),
    m('Kayak / Canoe / Paddleboard', 'boat', 'Traditional / small craft', Waves, 'Paddle craft', ['kayak', 'canoe', 'sup', 'paddleboard']),

    // ── Cable / Aerial ───────────────────────────────────────────────
    m('Cable car / Aerial tramway', 'transport', 'Cable / Aerial', CableCar, 'Téléphérique / Seilbahn', ['telepherique', 'seilbahn', 'aerial tram']),
    m('Gondola lift', 'transport', 'Cable / Aerial', CableCar, 'Detachable cabin lift', ['gondola']),
    m('Chairlift', 'transport', 'Cable / Aerial', CableCar, 'Open chair ski lift', ['ski chair']),
    m('Mi Teleférico', 'transport', 'Cable / Aerial', CableCar, 'La Paz urban cable-car network', ['la paz', 'bolivia cable']),
    m('Zipline', 'transport', 'Cable / Aerial', CableCar, 'Gravity zip wire', ['zip line', 'tirolesa', 'flying fox']),

    // ── Human-powered ────────────────────────────────────────────────
    m('Walking', 'walk', 'Human-powered', Footprints, 'On foot', ['walk', 'stroll']),
    m('Hiking', 'hike', 'Human-powered', Footprints, 'Trail / trek', ['hike', 'trek', 'trail']),
    m('Bicycle', 'bicycle', 'Human-powered', Bike, 'Pedal cycle', ['bike', 'cycling']),
    m('E-bike', 'e-bike', 'Human-powered', Bike, 'Pedelec / electric bicycle', ['ebike', 'electric bike']),
    m('Bike share', 'bike-rental', 'Human-powered', Bike, 'Vélib, Citi Bike, Santander Cycles', ['velib', 'citi bike', 'santander cycles', 'bikeshare']),
    m('E-scooter share', 'e-scooter', 'Human-powered', Zap, 'Lime / Bird / Tier / Voi', ['lime', 'bird', 'tier', 'voi', 'escooter']),
    m('Segway tour', 'e-scooter', 'Human-powered', Zap, 'Guided Segway', ['segway']),

    // ── Animal ───────────────────────────────────────────────────────
    m('Horse carriage', 'transport', 'Animal', Compass, 'Horse-drawn carriage (generic)', ['carriage', 'horse drawn']),
    m('Fiaker', 'transport', 'Animal', Compass, 'Vienna horse-drawn carriage', ['vienna carriage', 'austria']),
    m('Calèche', 'transport', 'Animal', Compass, 'France / Morocco horse carriage', ['caleche', 'marrakech', 'france carriage']),
    m('Horseback riding', 'transport', 'Animal', Compass, 'Saddle horse', ['horse', 'equestrian', 'trail ride']),
    m('Camel caravan', 'transport', 'Animal', Compass, 'Sahara / desert dromedary', ['camel', 'dromedary', 'sahara', 'rajasthan']),
    m('Yak ride', 'transport', 'Animal', Compass, 'Himalayan pack animal', ['yak', 'himalaya']),
    m('Dog sled', 'transport', 'Animal', Snowflake, 'Musher / qamutiik', ['husky', 'musher', 'qamutiik']),
    m('Reindeer sled', 'transport', 'Animal', Snowflake, 'Sami regions', ['sami', 'lapland', 'reindeer']),
    m('Donkey / Mule', 'transport', 'Animal', Compass, 'Pack animal — Grand Canyon, Greek islands', ['donkey', 'mule', 'grand canyon', 'santorini']),
    m('Llama trek', 'transport', 'Animal', Compass, 'Peru / Andean pack animal', ['peru', 'andes', 'llama']),

    // ── Unique / quirky ──────────────────────────────────────────────
    m('Bamboo train', 'train', 'Unique / quirky', TrainTrack, 'Cambodia Battambang norry', ['cambodia', 'battambang', 'norry']),
    m('Tourist submarine', 'boat', 'Unique / quirky', Ship, 'Underwater sightseeing sub', ['submarine', 'underwater']),
    m('Snowmobile', 'transport', 'Unique / quirky', MountainSnow, 'Motorised snow sled', ['skidoo', 'ski-doo', 'snow bike']),
    m('Ski lift', 'transport', 'Unique / quirky', CableCar, 'T-bar / Poma / Magic carpet', ['t-bar', 'poma', 'surface lift']),
    m('Toboggan', 'transport', 'Unique / quirky', MountainSnow, 'Sled / gravity snow sled', ['sled', 'sledge', 'luge']),
]

/** Fast category → modes lookup used by the dropdown group headers. */
export const TRANSPORT_MODES_BY_CATEGORY: Record<TransportCategory, TransportMode[]> =
    TRANSPORT_MODES.reduce(
        (acc, mode) => {
            if (!acc[mode.category]) acc[mode.category] = []
            acc[mode.category].push(mode)
            return acc
        },
        {} as Record<TransportCategory, TransportMode[]>,
    )

/** Display order of category groups in the dropdown. */
export const TRANSPORT_CATEGORY_ORDER: TransportCategory[] = [
    'Air',
    'High-speed rail',
    'Long-distance & scenic rail',
    'Metro / Urban rapid transit',
    'Tram / Streetcar',
    'Light metro / special rail',
    'Bus',
    'Regional / shared bus',
    'Taxi / Ride-hail',
    'Three-wheelers & motorcycle taxis',
    'Car',
    'Ferry',
    'Boat / Cruise',
    'Traditional / small craft',
    'Cable / Aerial',
    'Human-powered',
    'Animal',
    'Unique / quirky',
]

/**
 * Look up a mode's metadata (icon, kind, category) given the
 * free-form label stored on ``slot_data.mode``. Case-insensitive on
 * the label and the aliases list.
 *
 * Returns ``undefined`` if the mode is not in the canonical list —
 * callers should fall back to their own heuristics (e.g. the regex
 * ``pickTransportIcon`` in ``CityRouteBar``) for legacy slots.
 */
export function findTransportMode(modeString: string | null | undefined): TransportMode | undefined {
    if (!modeString || typeof modeString !== 'string') return undefined
    const needle = modeString.trim().toLowerCase()
    if (!needle) return undefined
    for (const mode of TRANSPORT_MODES) {
        if (mode.label.toLowerCase() === needle) return mode
    }
    for (const mode of TRANSPORT_MODES) {
        if (mode.aliases.some((a) => a.toLowerCase() === needle)) return mode
    }
    return undefined
}
