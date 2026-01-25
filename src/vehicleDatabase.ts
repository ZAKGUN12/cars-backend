import { VehicleDatabase } from './types';

export const VEHICLE_DATABASE: VehicleDatabase = {
  easy: [
    // Existing
    {
      id: 'easy_001',
      vehicle: { brand: 'Toyota', model: 'Camry', year: 2020 },
      imageKey: 'images/vehicles/easy/toyota-camry-2020.jpg',
      imagePart: 'headlight',
      brandOptions: ['Toyota', 'Honda', 'Ford', 'Chevrolet'],
      modelOptions: ['Camry', 'Corolla', 'Prius', 'Highlander'],
      yearOptions: [2020, 2019, 2015, 2010],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'mainstream']
    },
    {
      id: 'easy_002',
      vehicle: { brand: 'Honda', model: 'Civic', year: 2019 },
      imageKey: 'images/vehicles/easy/honda-civic-2019.jpg',
      imagePart: 'grille',
      brandOptions: ['Honda', 'Toyota', 'Nissan', 'Hyundai'],
      modelOptions: ['Civic', 'Accord', 'CR-V', 'Pilot'],
      yearOptions: [2019, 2020, 2017, 2014],
      level: 'Easy',
      difficulty: 1,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_003',
      vehicle: { brand: 'Ford', model: 'F-150', year: 2023 },
      imageKey: 'images/vehicles/easy/ford-f150-2023-taillight.jpg',
      imagePart: 'taillight',
      brandOptions: ['Ford', 'Chevrolet', 'Ram', 'GMC'],
      modelOptions: ['F-150', 'Mustang', 'Explorer', 'Escape'],
      yearOptions: [2023, 2020, 2017, 2014],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    },
    // New from S3
    {
      id: 'easy_004',
      vehicle: { brand: 'Buick', model: 'Encore', year: 2022 },
      imageKey: 'images/vehicles/easy/buick-encore-2022-headlight.webp',
      imagePart: 'headlight',
      brandOptions: ['Buick', 'Chevrolet', 'GMC', 'Cadillac'],
      modelOptions: ['Encore', 'Envision', 'Enclave', 'Regal'],
      yearOptions: [2022, 2021, 2020, 2019],
      level: 'Easy',
      difficulty: 3,
      tags: ['suv', 'compact']
    },
    {
      id: 'easy_005',
      vehicle: { brand: 'Chevrolet', model: 'Silverado', year: 2020 },
      imageKey: 'images/vehicles/easy/chevrolet-silverado-2020.jpg',
      imagePart: 'front',
      brandOptions: ['Chevrolet', 'Ford', 'Ram', 'GMC'],
      modelOptions: ['Silverado', 'Colorado', 'Tahoe', 'Suburban'],
      yearOptions: [2020, 2021, 2019, 2018],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    },
    {
      id: 'easy_006',
      vehicle: { brand: 'Chevrolet', model: 'Silverado', year: 2022 },
      imageKey: 'images/vehicles/easy/chevrolet-silverado-2022-badge.jpg',
      imagePart: 'badge',
      brandOptions: ['Chevrolet', 'Ford', 'Ram', 'GMC'],
      modelOptions: ['Silverado', 'Colorado', 'Tahoe', 'Suburban'],
      yearOptions: [2022, 2021, 2020, 2019],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    },
    {
      id: 'easy_007',
      vehicle: { brand: 'Ford', model: 'Mustang', year: 2021 },
      imageKey: 'images/vehicles/easy/ford-mustang-2021.jpg',
      imagePart: 'front',
      brandOptions: ['Ford', 'Chevrolet', 'Dodge', 'Toyota'],
      modelOptions: ['Mustang', 'F-150', 'Explorer', 'Escape'],
      yearOptions: [2021, 2020, 2019, 2018],
      level: 'Easy',
      difficulty: 3,
      tags: ['sports', 'coupe']
    },
    {
      id: 'easy_008',
      vehicle: { brand: 'GMC', model: 'Sierra', year: 2023 },
      imageKey: 'images/vehicles/easy/gmc-sierra-2023-badge.jpg',
      imagePart: 'badge',
      brandOptions: ['GMC', 'Chevrolet', 'Ford', 'Ram'],
      modelOptions: ['Sierra', 'Canyon', 'Yukon', 'Acadia'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    },
    {
      id: 'easy_009',
      vehicle: { brand: 'Honda', model: 'Civic', year: 2023 },
      imageKey: 'images/vehicles/easy/honda-civic-2023-grille.jpg',
      imagePart: 'grille',
      brandOptions: ['Honda', 'Toyota', 'Nissan', 'Mazda'],
      modelOptions: ['Civic', 'Accord', 'CR-V', 'Pilot'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 1,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_010',
      vehicle: { brand: 'Hyundai', model: 'Elantra', year: 2021 },
      imageKey: 'images/vehicles/easy/hyundai-elantra-2021.jpg',
      imagePart: 'front',
      brandOptions: ['Hyundai', 'Kia', 'Toyota', 'Honda'],
      modelOptions: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe'],
      yearOptions: [2021, 2022, 2020, 2019],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_011',
      vehicle: { brand: 'Hyundai', model: 'Elantra', year: 2023 },
      imageKey: 'images/vehicles/easy/hyundai-elantra-2023-headlight.jpg',
      imagePart: 'headlight',
      brandOptions: ['Hyundai', 'Kia', 'Toyota', 'Honda'],
      modelOptions: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_012',
      vehicle: { brand: 'Jeep', model: 'Wrangler', year: 2020 },
      imageKey: 'images/vehicles/easy/jeep-wrangler-2020.jpg',
      imagePart: 'front',
      brandOptions: ['Jeep', 'Ford', 'Chevrolet', 'Toyota'],
      modelOptions: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass'],
      yearOptions: [2020, 2021, 2019, 2018],
      level: 'Easy',
      difficulty: 2,
      tags: ['suv', 'offroad']
    },
    {
      id: 'easy_013',
      vehicle: { brand: 'Jeep', model: 'Wrangler', year: 2023 },
      imageKey: 'images/vehicles/easy/jeep-wrangler-2023-grille.jpeg',
      imagePart: 'grille',
      brandOptions: ['Jeep', 'Ford', 'Chevrolet', 'Toyota'],
      modelOptions: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 1,
      tags: ['suv', 'offroad']
    },
    {
      id: 'easy_014',
      vehicle: { brand: 'Kia', model: 'Forte', year: 2022 },
      imageKey: 'images/vehicles/easy/kia-forte-2022-grille.webp',
      imagePart: 'grille',
      brandOptions: ['Kia', 'Hyundai', 'Toyota', 'Honda'],
      modelOptions: ['Forte', 'Optima', 'Sportage', 'Sorento'],
      yearOptions: [2022, 2021, 2020, 2019],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'compact']
    },
    {
      id: 'easy_015',
      vehicle: { brand: 'Mazda', model: 'CX-5', year: 2023 },
      imageKey: 'images/vehicles/easy/mazda-cx5-2023-taillight.jpeg',
      imagePart: 'taillight',
      brandOptions: ['Mazda', 'Honda', 'Toyota', 'Nissan'],
      modelOptions: ['CX-5', 'CX-9', 'Mazda3', 'Mazda6'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 2,
      tags: ['suv', 'crossover']
    },
    {
      id: 'easy_016',
      vehicle: { brand: 'Nissan', model: 'Altima', year: 2019 },
      imageKey: 'images/vehicles/easy/nissan-altima-2019.jpg',
      imagePart: 'front',
      brandOptions: ['Nissan', 'Toyota', 'Honda', 'Mazda'],
      modelOptions: ['Altima', 'Maxima', 'Sentra', 'Rogue'],
      yearOptions: [2019, 2020, 2018, 2017],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'midsize']
    },
    {
      id: 'easy_017',
      vehicle: { brand: 'Nissan', model: 'Altima', year: 2021 },
      imageKey: 'images/vehicles/easy/nissan-altima-2021-wheel.webp',
      imagePart: 'wheel',
      brandOptions: ['Nissan', 'Toyota', 'Honda', 'Mazda'],
      modelOptions: ['Altima', 'Maxima', 'Sentra', 'Rogue'],
      yearOptions: [2021, 2020, 2019, 2022],
      level: 'Easy',
      difficulty: 3,
      tags: ['sedan', 'midsize']
    },
    {
      id: 'easy_018',
      vehicle: { brand: 'Ram', model: '1500', year: 2022 },
      imageKey: 'images/vehicles/easy/ram-1500-2022-taillight.jpeg',
      imagePart: 'taillight',
      brandOptions: ['Ram', 'Ford', 'Chevrolet', 'GMC'],
      modelOptions: ['1500', '2500', '3500', 'Rebel'],
      yearOptions: [2022, 2021, 2020, 2023],
      level: 'Easy',
      difficulty: 2,
      tags: ['truck']
    },
    {
      id: 'easy_019',
      vehicle: { brand: 'Subaru', model: 'Outback', year: 2022 },
      imageKey: 'images/vehicles/easy/subaru-outback-2022-badge.jpeg',
      imagePart: 'badge',
      brandOptions: ['Subaru', 'Toyota', 'Honda', 'Mazda'],
      modelOptions: ['Outback', 'Forester', 'Crosstrek', 'Ascent'],
      yearOptions: [2022, 2021, 2020, 2023],
      level: 'Easy',
      difficulty: 2,
      tags: ['wagon', 'awd']
    },
    {
      id: 'easy_020',
      vehicle: { brand: 'Volkswagen', model: 'Jetta', year: 2023 },
      imageKey: 'images/vehicles/easy/volkswagen-jetta-2023-headlight.jpeg',
      imagePart: 'headlight',
      brandOptions: ['Volkswagen', 'Honda', 'Toyota', 'Mazda'],
      modelOptions: ['Jetta', 'Passat', 'Tiguan', 'Atlas'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Easy',
      difficulty: 2,
      tags: ['sedan', 'compact']
    }
  ],
  medium: [
    // Existing
    {
      id: 'medium_001',
      vehicle: { brand: 'BMW', model: 'X5', year: 2020 },
      imageKey: 'images/vehicles/medium/bmw-x5-2020.jpg',
      imagePart: 'badge',
      brandOptions: ['BMW', 'Audi', 'Mercedes-Benz', 'Lexus'],
      modelOptions: ['X5', 'X3', '3 Series', '5 Series'],
      yearOptions: [2020, 2019, 2021, 2018],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'suv']
    },
    {
      id: 'medium_002',
      vehicle: { brand: 'Mercedes-Benz', model: 'C-Class', year: 2020 },
      imageKey: 'images/vehicles/medium/mercedes-c-class-2020.jpg',
      imagePart: 'grille',
      brandOptions: ['Mercedes-Benz', 'BMW', 'Audi', 'Lexus'],
      modelOptions: ['C-Class', 'E-Class', 'GLC', 'GLE'],
      yearOptions: [2020, 2021, 2019, 2018],
      level: 'Medium',
      difficulty: 6,
      tags: ['luxury', 'sedan']
    },
    // New from S3
    {
      id: 'medium_003',
      vehicle: { brand: 'Acura', model: 'TLX', year: 2022 },
      imageKey: 'images/vehicles/medium/acura-tlx-2022-taillight.jpeg',
      imagePart: 'taillight',
      brandOptions: ['Acura', 'Lexus', 'Infiniti', 'Genesis'],
      modelOptions: ['TLX', 'MDX', 'RDX', 'ILX'],
      yearOptions: [2022, 2021, 2020, 2023],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'sedan']
    },
    {
      id: 'medium_004',
      vehicle: { brand: 'Audi', model: 'A4', year: 2021 },
      imageKey: 'images/vehicles/medium/audi-a4-2021.jpg',
      imagePart: 'front',
      brandOptions: ['Audi', 'BMW', 'Mercedes-Benz', 'Lexus'],
      modelOptions: ['A4', 'A6', 'Q5', 'Q7'],
      yearOptions: [2021, 2020, 2022, 2019],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'sedan']
    },
    {
      id: 'medium_005',
      vehicle: { brand: 'Cadillac', model: 'XT5', year: 2023 },
      imageKey: 'images/vehicles/medium/cadillac-xt5-2023-grille.jpeg',
      imagePart: 'grille',
      brandOptions: ['Cadillac', 'Lincoln', 'Lexus', 'Acura'],
      modelOptions: ['XT5', 'XT6', 'Escalade', 'CT5'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'suv']
    },
    {
      id: 'medium_006',
      vehicle: { brand: 'Genesis', model: 'G90', year: 2023 },
      imageKey: 'images/vehicles/medium/genesis-g90-2023-grille.jpeg',
      imagePart: 'grille',
      brandOptions: ['Genesis', 'Lexus', 'BMW', 'Mercedes-Benz'],
      modelOptions: ['G90', 'G80', 'GV80', 'GV70'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Medium',
      difficulty: 6,
      tags: ['luxury', 'sedan']
    },
    {
      id: 'medium_007',
      vehicle: { brand: 'Infiniti', model: 'Q50', year: 2023 },
      imageKey: 'images/vehicles/medium/infiniti-q50-2023-badge.jpeg',
      imagePart: 'badge',
      brandOptions: ['Infiniti', 'Lexus', 'Acura', 'Genesis'],
      modelOptions: ['Q50', 'Q60', 'QX50', 'QX60'],
      yearOptions: [2023, 2022, 2021, 2020],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'sedan']
    },
    {
      id: 'medium_008',
      vehicle: { brand: 'Lexus', model: 'ES 350', year: 2022 },
      imageKey: 'images/vehicles/medium/lexus-es350-2022-headlight.jpeg',
      imagePart: 'headlight',
      brandOptions: ['Lexus', 'BMW', 'Mercedes-Benz', 'Audi'],
      modelOptions: ['ES 350', 'IS 350', 'RX 350', 'GX 460'],
      yearOptions: [2022, 2021, 2020, 2023],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'sedan']
    },
    {
      id: 'medium_009',
      vehicle: { brand: 'Lincoln', model: 'Navigator', year: 2022 },
      imageKey: 'images/vehicles/medium/lincoln-navigator-2022-taillight.jpeg',
      imagePart: 'taillight',
      brandOptions: ['Lincoln', 'Cadillac', 'Lexus', 'BMW'],
      modelOptions: ['Navigator', 'Aviator', 'Nautilus', 'Corsair'],
      yearOptions: [2022, 2021, 2020, 2023],
      level: 'Medium',
      difficulty: 5,
      tags: ['luxury', 'suv']
    }
  ],
  hard: [
    {
      id: 'hard_001',
      vehicle: { brand: 'Porsche', model: '911 GT3', year: 2020 },
      imageKey: 'images/vehicles/hard/porsche-911gt3-2020-exhaust.jpg',
      imagePart: 'exhaust',
      brandOptions: ['Porsche', 'Ferrari', 'Lamborghini', 'McLaren'],
      modelOptions: ['911 GT3', '911 Turbo', 'Cayman GT4', 'Boxster'],
      yearOptions: [2020, 2019, 2018, 2017],
      level: 'Hard',
      difficulty: 9,
      tags: ['sports', 'exotic', 'track']
    }
  ]
};
