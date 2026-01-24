# Vehicle Database Expansion Plan

## Current Issues
- Only 6 total vehicles (3 easy, 2 medium, 1 hard)
- Career Mode needs 10 unique vehicles per level
- Same vehicles repeat in single game session
- No tracking of used vehicles

## Required Vehicles

### Easy Level (Mainstream Cars)
Need: **30 vehicles minimum** (for 3 career levels × 10 vehicles each)

**Recommended vehicles:**
1. Toyota Camry 2020 ✅ (exists)
2. Honda Civic 2019 ✅ (exists)
3. Ford F-150 2023 ✅ (exists)
4. Chevrolet Silverado 2022
5. Honda Accord 2021
6. Toyota Corolla 2020
7. Nissan Altima 2021
8. Hyundai Elantra 2022
9. Mazda CX-5 2021
10. Toyota RAV4 2022
11. Honda CR-V 2021
12. Ford Escape 2022
13. Chevrolet Equinox 2021
14. Jeep Grand Cherokee 2022
15. Subaru Outback 2021
16. Volkswagen Jetta 2021
17. Kia Forte 2022
18. Hyundai Tucson 2022
19. Nissan Rogue 2021
20. Ford Explorer 2022
21. Dodge Ram 1500 2022
22. GMC Sierra 2021
23. Toyota Tacoma 2022
24. Honda Pilot 2021
25. Mazda3 2021
26. Subaru Forester 2022
27. Volkswagen Tiguan 2021
28. Kia Sportage 2022
29. Hyundai Santa Fe 2021
30. Nissan Pathfinder 2022

### Medium Level (Luxury/Performance)
Need: **30 vehicles minimum**

**Recommended vehicles:**
1. BMW X5 2020 ✅ (exists)
2. Mercedes-Benz C-Class 2020 ✅ (exists)
3. Audi A4 2021
4. Lexus RX 350 2022
5. BMW 3 Series 2021
6. Mercedes-Benz E-Class 2021
7. Audi Q5 2022
8. Lexus ES 350 2021
9. Cadillac Escalade 2022
10. Lincoln Navigator 2021
11. Volvo XC90 2022
12. Genesis G80 2021
13. Acura MDX 2022
14. Infiniti QX60 2021
15. BMW X3 2022
16. Mercedes-Benz GLE 2021
17. Audi A6 2021
18. Lexus GX 460 2022
19. Porsche Cayenne 2021
20. BMW 5 Series 2022
21. Mercedes-Benz S-Class 2021
22. Audi Q7 2022
23. Lexus LS 500 2021
24. Cadillac CT5 2022
25. Lincoln Aviator 2021
26. Volvo S90 2022
27. Genesis GV80 2021
28. Acura TLX 2022
29. Infiniti Q50 2021
30. BMW X7 2022

### Hard Level (Exotic/Supercars)
Need: **30 vehicles minimum**

**Recommended vehicles:**
1. Porsche 911 GT3 2020 ✅ (exists)
2. Ferrari 488 GTB 2021
3. Lamborghini Huracán 2022
4. McLaren 720S 2021
5. Porsche 911 Turbo S 2022
6. Ferrari F8 Tributo 2021
7. Lamborghini Aventador 2022
8. McLaren 765LT 2021
9. Aston Martin DB11 2022
10. Bentley Continental GT 2021
11. Rolls-Royce Ghost 2022
12. Maserati MC20 2021
13. Corvette C8 Z06 2023
14. Porsche Taycan Turbo S 2022
15. Ferrari Roma 2021
16. Lamborghini Urus 2022
17. McLaren GT 2021
18. Aston Martin Vantage 2022
19. Bentley Bentayga 2021
20. Rolls-Royce Cullinan 2022
21. Maserati Quattroporte 2021
22. Corvette C8 Stingray 2022
23. Porsche Panamera Turbo 2021
24. Ferrari 812 Superfast 2022
25. Lamborghini Gallardo 2021
26. McLaren Artura 2022
27. Aston Martin DBX 2021
28. Bentley Flying Spur 2022
29. Bugatti Chiron 2021
30. Pagani Huayra 2022

## Image Requirements

For each vehicle, we need high-quality images of:
- **Headlights** (close-up, distinctive features)
- **Taillights** (close-up, distinctive features)
- **Grille** (front fascia, brand identity)
- **Badge/Logo** (brand emblem)
- **Wheels** (distinctive rim design)
- **Exhaust** (for performance cars)
- **Side profile** (distinctive body lines)

## S3 Folder Structure
```
s3://vehicle-guesser-1764962592/images/vehicles/
├── easy/
│   ├── toyota-camry-2020-headlight.jpg
│   ├── toyota-camry-2020-taillight.jpg
│   ├── honda-civic-2019-grille.jpg
│   └── ...
├── medium/
│   ├── bmw-x5-2020-badge.jpg
│   ├── mercedes-c-class-2020-grille.jpg
│   └── ...
└── hard/
    ├── porsche-911gt3-2020-exhaust.jpg
    ├── ferrari-488gtb-2021-headlight.jpg
    └── ...
```

## Next Steps

1. **Collect Images**: Source high-quality vehicle images
2. **Upload to S3**: Organize in proper folder structure
3. **Update Database**: Add vehicle entries to cognito-index.js
4. **Implement Deduplication**: Track used vehicles per session
5. **Test Career Mode**: Ensure 10 unique vehicles per level
