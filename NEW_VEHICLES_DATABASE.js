// NEW VEHICLES TO ADD - Option B

// Add to expandedVehicleDatabase.js

// MEDIUM DIFFICULTY (10 new vehicles)
const NEW_MEDIUM = [
  {
    id: 'medium_010',
    vehicle: { brand: 'Alfa Romeo', model: 'Giulia', year: 2022 },
    imageKey: 'images/vehicles/medium/alfa-romeo-giulia-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Alfa Romeo', 'BMW', 'Audi', 'Mercedes-Benz'],
    modelOptions: ['Giulia', 'Stelvio', '4C', 'Tonale'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Medium',
    difficulty: 6,
    tags: ['luxury', 'sedan', 'italian']
  },
  {
    id: 'medium_011',
    vehicle: { brand: 'Volvo', model: 'XC90', year: 2023 },
    imageKey: 'images/vehicles/medium/volvo-xc90-2023-headlight.jpg',
    imagePart: 'headlight',
    brandOptions: ['Volvo', 'BMW', 'Audi', 'Mercedes-Benz'],
    modelOptions: ['XC90', 'XC60', 'S90', 'V90'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Medium',
    difficulty: 5,
    tags: ['luxury', 'suv', 'swedish']
  },
  {
    id: 'medium_012',
    vehicle: { brand: 'Tesla', model: 'Model S', year: 2022 },
    imageKey: 'images/vehicles/medium/tesla-model-s-2022-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Tesla', 'Lucid', 'Rivian', 'Polestar'],
    modelOptions: ['Model S', 'Model 3', 'Model X', 'Model Y'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Medium',
    difficulty: 5,
    tags: ['luxury', 'electric', 'sedan']
  },
  {
    id: 'medium_013',
    vehicle: { brand: 'Jaguar', model: 'F-PACE', year: 2023 },
    imageKey: 'images/vehicles/medium/jaguar-f-pace-2023-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['Jaguar', 'Land Rover', 'BMW', 'Audi'],
    modelOptions: ['F-PACE', 'E-PACE', 'I-PACE', 'XF'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Medium',
    difficulty: 6,
    tags: ['luxury', 'suv', 'british']
  },
  {
    id: 'medium_014',
    vehicle: { brand: 'Land Rover', model: 'Range Rover', year: 2022 },
    imageKey: 'images/vehicles/medium/land-rover-range-rover-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Land Rover', 'Jaguar', 'BMW', 'Mercedes-Benz'],
    modelOptions: ['Range Rover', 'Range Rover Sport', 'Defender', 'Discovery'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Medium',
    difficulty: 6,
    tags: ['luxury', 'suv', 'british']
  },
  {
    id: 'medium_015',
    vehicle: { brand: 'Maserati', model: 'Ghibli', year: 2023 },
    imageKey: 'images/vehicles/medium/maserati-ghibli-2023-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Maserati', 'Alfa Romeo', 'BMW', 'Mercedes-Benz'],
    modelOptions: ['Ghibli', 'Quattroporte', 'Levante', 'MC20'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Medium',
    difficulty: 7,
    tags: ['luxury', 'sedan', 'italian']
  },
  {
    id: 'medium_016',
    vehicle: { brand: 'Chrysler', model: '300', year: 2022 },
    imageKey: 'images/vehicles/medium/chrysler-300-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Chrysler', 'Dodge', 'Cadillac', 'Lincoln'],
    modelOptions: ['300', 'Pacifica', '200', 'Aspen'],
    yearOptions: [2022, 2021, 2020, 2019],
    level: 'Medium',
    difficulty: 5,
    tags: ['luxury', 'sedan', 'american']
  },
  {
    id: 'medium_017',
    vehicle: { brand: 'Buick', model: 'Enclave', year: 2023 },
    imageKey: 'images/vehicles/medium/buick-enclave-2023-headlight.jpg',
    imagePart: 'headlight',
    brandOptions: ['Buick', 'GMC', 'Cadillac', 'Chevrolet'],
    modelOptions: ['Enclave', 'Encore', 'Envision', 'Regal'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Medium',
    difficulty: 5,
    tags: ['luxury', 'suv', 'american']
  },
  {
    id: 'medium_018',
    vehicle: { brand: 'GMC', model: 'Yukon', year: 2023 },
    imageKey: 'images/vehicles/medium/gmc-yukon-2023-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['GMC', 'Chevrolet', 'Cadillac', 'Ford'],
    modelOptions: ['Yukon', 'Yukon XL', 'Acadia', 'Terrain'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Medium',
    difficulty: 5,
    tags: ['luxury', 'suv', 'american']
  },
  {
    id: 'medium_019',
    vehicle: { brand: 'Dodge', model: 'Durango', year: 2022 },
    imageKey: 'images/vehicles/medium/dodge-durango-2022-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Dodge', 'Jeep', 'Chevrolet', 'Ford'],
    modelOptions: ['Durango', 'Charger', 'Challenger', 'Journey'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Medium',
    difficulty: 5,
    tags: ['suv', 'american', 'performance']
  }
];

// HARD DIFFICULTY (20 new vehicles)
const NEW_HARD = [
  {
    id: 'hard_002',
    vehicle: { brand: 'Ferrari', model: '488', year: 2020 },
    imageKey: 'images/vehicles/hard/ferrari-488-2020-exhaust.jpg',
    imagePart: 'exhaust',
    brandOptions: ['Ferrari', 'Lamborghini', 'McLaren', 'Porsche'],
    modelOptions: ['488', 'F8 Tributo', '812 Superfast', 'Roma'],
    yearOptions: [2020, 2019, 2021, 2018],
    level: 'Hard',
    difficulty: 9,
    tags: ['exotic', 'supercar', 'italian']
  },
  {
    id: 'hard_003',
    vehicle: { brand: 'Lamborghini', model: 'Huracán', year: 2021 },
    imageKey: 'images/vehicles/hard/lamborghini-huracan-2021-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['Lamborghini', 'Ferrari', 'McLaren', 'Porsche'],
    modelOptions: ['Huracán', 'Aventador', 'Urus', 'Gallardo'],
    yearOptions: [2021, 2020, 2022, 2019],
    level: 'Hard',
    difficulty: 9,
    tags: ['exotic', 'supercar', 'italian']
  },
  {
    id: 'hard_004',
    vehicle: { brand: 'McLaren', model: '720S', year: 2020 },
    imageKey: 'images/vehicles/hard/mclaren-720s-2020-headlight.jpg',
    imagePart: 'headlight',
    brandOptions: ['McLaren', 'Ferrari', 'Lamborghini', 'Porsche'],
    modelOptions: ['720S', '570S', 'GT', 'Artura'],
    yearOptions: [2020, 2019, 2021, 2018],
    level: 'Hard',
    difficulty: 9,
    tags: ['exotic', 'supercar', 'british']
  },
  {
    id: 'hard_005',
    vehicle: { brand: 'Aston Martin', model: 'DB11', year: 2022 },
    imageKey: 'images/vehicles/hard/aston-martin-db11-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Aston Martin', 'Bentley', 'Ferrari', 'Porsche'],
    modelOptions: ['DB11', 'Vantage', 'DBS', 'DBX'],
    yearOptions: [2022, 2021, 2020, 2023],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'grand tourer', 'british']
  },
  {
    id: 'hard_006',
    vehicle: { brand: 'Bentley', model: 'Continental GT', year: 2023 },
    imageKey: 'images/vehicles/hard/bentley-continental-gt-2023-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Bentley', 'Rolls-Royce', 'Aston Martin', 'Mercedes-Benz'],
    modelOptions: ['Continental GT', 'Flying Spur', 'Bentayga', 'Mulsanne'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'luxury', 'british']
  },
  {
    id: 'hard_007',
    vehicle: { brand: 'Rolls-Royce', model: 'Ghost', year: 2022 },
    imageKey: 'images/vehicles/hard/rolls-royce-ghost-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Rolls-Royce', 'Bentley', 'Mercedes-Benz', 'BMW'],
    modelOptions: ['Ghost', 'Phantom', 'Wraith', 'Cullinan'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'ultra-luxury', 'british']
  },
  {
    id: 'hard_008',
    vehicle: { brand: 'Bugatti', model: 'Chiron', year: 2020 },
    imageKey: 'images/vehicles/hard/bugatti-chiron-2020-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Bugatti', 'Koenigsegg', 'Pagani', 'Ferrari'],
    modelOptions: ['Chiron', 'Veyron', 'Divo', 'Centodieci'],
    yearOptions: [2020, 2019, 2021, 2018],
    level: 'Hard',
    difficulty: 10,
    tags: ['exotic', 'hypercar', 'french']
  },
  {
    id: 'hard_009',
    vehicle: { brand: 'Koenigsegg', model: 'Agera', year: 2019 },
    imageKey: 'images/vehicles/hard/koenigsegg-agera-2019-exhaust.jpg',
    imagePart: 'exhaust',
    brandOptions: ['Koenigsegg', 'Bugatti', 'Pagani', 'McLaren'],
    modelOptions: ['Agera', 'Jesko', 'Regera', 'Gemera'],
    yearOptions: [2019, 2018, 2020, 2017],
    level: 'Hard',
    difficulty: 10,
    tags: ['exotic', 'hypercar', 'swedish']
  },
  {
    id: 'hard_010',
    vehicle: { brand: 'Pagani', model: 'Huayra', year: 2020 },
    imageKey: 'images/vehicles/hard/pagani-huayra-2020-wheel.jpg',
    imagePart: 'wheel',
    brandOptions: ['Pagani', 'Koenigsegg', 'Bugatti', 'Ferrari'],
    modelOptions: ['Huayra', 'Zonda', 'Imola', 'Utopia'],
    yearOptions: [2020, 2019, 2021, 2018],
    level: 'Hard',
    difficulty: 10,
    tags: ['exotic', 'hypercar', 'italian']
  },
  {
    id: 'hard_011',
    vehicle: { brand: 'Lotus', model: 'Evora', year: 2021 },
    imageKey: 'images/vehicles/hard/lotus-evora-2021-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['Lotus', 'McLaren', 'Porsche', 'Ferrari'],
    modelOptions: ['Evora', 'Elise', 'Exige', 'Emira'],
    yearOptions: [2021, 2020, 2022, 2019],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'sports', 'british']
  },
  {
    id: 'hard_012',
    vehicle: { brand: 'Porsche', model: 'Taycan', year: 2023 },
    imageKey: 'images/vehicles/hard/porsche-taycan-2023-headlight.jpg',
    imagePart: 'headlight',
    brandOptions: ['Porsche', 'Tesla', 'Audi', 'BMW'],
    modelOptions: ['Taycan', '911', 'Panamera', 'Cayenne'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Hard',
    difficulty: 7,
    tags: ['exotic', 'electric', 'german']
  },
  {
    id: 'hard_013',
    vehicle: { brand: 'Ferrari', model: 'F8 Tributo', year: 2021 },
    imageKey: 'images/vehicles/hard/ferrari-f8-tributo-2021-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Ferrari', 'Lamborghini', 'McLaren', 'Porsche'],
    modelOptions: ['F8 Tributo', '488', 'Roma', 'SF90'],
    yearOptions: [2021, 2020, 2022, 2019],
    level: 'Hard',
    difficulty: 9,
    tags: ['exotic', 'supercar', 'italian']
  },
  {
    id: 'hard_014',
    vehicle: { brand: 'Lamborghini', model: 'Aventador', year: 2022 },
    imageKey: 'images/vehicles/hard/lamborghini-aventador-2022-exhaust.jpg',
    imagePart: 'exhaust',
    brandOptions: ['Lamborghini', 'Ferrari', 'McLaren', 'Porsche'],
    modelOptions: ['Aventador', 'Huracán', 'Urus', 'Sián'],
    yearOptions: [2022, 2021, 2020, 2023],
    level: 'Hard',
    difficulty: 9,
    tags: ['exotic', 'supercar', 'italian']
  },
  {
    id: 'hard_015',
    vehicle: { brand: 'McLaren', model: 'GT', year: 2023 },
    imageKey: 'images/vehicles/hard/mclaren-gt-2023-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['McLaren', 'Ferrari', 'Aston Martin', 'Porsche'],
    modelOptions: ['GT', '720S', 'Artura', '570S'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'grand tourer', 'british']
  },
  {
    id: 'hard_016',
    vehicle: { brand: 'Aston Martin', model: 'Vantage', year: 2022 },
    imageKey: 'images/vehicles/hard/aston-martin-vantage-2022-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Aston Martin', 'Porsche', 'Ferrari', 'McLaren'],
    modelOptions: ['Vantage', 'DB11', 'DBS', 'DBX'],
    yearOptions: [2022, 2021, 2023, 2020],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'sports', 'british']
  },
  {
    id: 'hard_017',
    vehicle: { brand: 'Maserati', model: 'MC20', year: 2023 },
    imageKey: 'images/vehicles/hard/maserati-mc20-2023-headlight.jpg',
    imagePart: 'headlight',
    brandOptions: ['Maserati', 'Ferrari', 'Lamborghini', 'McLaren'],
    modelOptions: ['MC20', 'Ghibli', 'Quattroporte', 'Levante'],
    yearOptions: [2023, 2022, 2021, 2024],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'supercar', 'italian']
  },
  {
    id: 'hard_018',
    vehicle: { brand: 'Chevrolet', model: 'Corvette C8 Z06', year: 2023 },
    imageKey: 'images/vehicles/hard/corvette-c8-z06-2023-badge.jpg',
    imagePart: 'badge',
    brandOptions: ['Chevrolet', 'Porsche', 'Ferrari', 'McLaren'],
    modelOptions: ['Corvette C8 Z06', 'Corvette Stingray', 'Camaro ZL1', 'Corvette Z06'],
    yearOptions: [2023, 2022, 2024, 2021],
    level: 'Hard',
    difficulty: 7,
    tags: ['exotic', 'supercar', 'american']
  },
  {
    id: 'hard_019',
    vehicle: { brand: 'Ford', model: 'GT', year: 2020 },
    imageKey: 'images/vehicles/hard/ford-gt-2020-exhaust.jpg',
    imagePart: 'exhaust',
    brandOptions: ['Ford', 'Chevrolet', 'Ferrari', 'McLaren'],
    modelOptions: ['GT', 'Mustang Shelby GT500', 'F-150 Raptor', 'Mustang'],
    yearOptions: [2020, 2019, 2021, 2018],
    level: 'Hard',
    difficulty: 8,
    tags: ['exotic', 'supercar', 'american']
  },
  {
    id: 'hard_020',
    vehicle: { brand: 'Acura', model: 'NSX', year: 2022 },
    imageKey: 'images/vehicles/hard/acura-nsx-2022-taillight.jpg',
    imagePart: 'taillight',
    brandOptions: ['Acura', 'Lexus', 'Porsche', 'Audi'],
    modelOptions: ['NSX', 'TLX Type S', 'MDX', 'Integra'],
    yearOptions: [2022, 2021, 2020, 2023],
    level: 'Hard',
    difficulty: 7,
    tags: ['exotic', 'supercar', 'japanese']
  },
  {
    id: 'hard_021',
    vehicle: { brand: 'Nissan', model: 'GT-R', year: 2023 },
    imageKey: 'images/vehicles/hard/nissan-gt-r-2023-grille.jpg',
    imagePart: 'grille',
    brandOptions: ['Nissan', 'Porsche', 'Audi', 'BMW'],
    modelOptions: ['GT-R', 'Z', '370Z', 'Skyline'],
    yearOptions: [2023, 2022, 2021, 2020],
    level: 'Hard',
    difficulty: 7,
    tags: ['exotic', 'supercar', 'japanese']
  }
];

// Instructions:
// 1. Add NEW_MEDIUM array items to the medium: [] section
// 2. Add NEW_HARD array items to the hard: [] section
// 3. Total: Easy 20, Medium 19, Hard 21 = 60 vehicles
