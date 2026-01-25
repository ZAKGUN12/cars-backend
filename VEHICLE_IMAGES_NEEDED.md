# Vehicle Images Needed for Option B

## Medium Difficulty (10 vehicles)

1. Alfa Romeo Giulia 2022 - grille
2. Volvo XC90 2023 - headlight
3. Tesla Model S 2022 - badge
4. Jaguar F-PACE 2023 - taillight
5. Land Rover Range Rover 2022 - grille
6. Maserati Ghibli 2023 - badge
7. Chrysler 300 2022 - grille
8. Buick Enclave 2023 - headlight
9. GMC Yukon 2023 - taillight
10. Dodge Durango 2022 - badge

## Hard Difficulty (20 vehicles)

1. Ferrari 488 2020 - exhaust
2. Lamborghini Huracan 2021 - taillight
3. McLaren 720S 2020 - headlight
4. Aston Martin DB11 2022 - grille
5. Bentley Continental GT 2023 - badge
6. Rolls-Royce Ghost 2022 - grille
7. Bugatti Chiron 2020 - badge
8. Koenigsegg Agera 2019 - exhaust
9. Pagani Huayra 2020 - wheel
10. Lotus Evora 2021 - taillight
11. Porsche Taycan 2023 - headlight
12. Ferrari F8 Tributo 2021 - badge
13. Lamborghini Aventador 2022 - exhaust
14. McLaren GT 2023 - taillight
15. Aston Martin Vantage 2022 - grille
16. Maserati MC20 2023 - headlight
17. Corvette C8 Z06 2023 - badge
18. Ford GT 2020 - exhaust
19. Acura NSX 2022 - taillight
20. Nissan GT-R 2023 - grille

## Image Requirements
- Format: JPG, JPEG, or WebP
- Size: 500KB - 2MB
- Resolution: 1920x1080 or higher
- Focus: Close-up of specified part
- Quality: Clear, well-lit, no watermarks

## Sources
- Unsplash.com (free, high quality)
- Pexels.com (free, high quality)
- Pixabay.com (free)
- Manufacturer websites (press kits)

## Upload Instructions
1. Download images
2. Rename: `brand-model-year-part.jpg`
   Example: `ferrari-488-2020-exhaust.jpg`
3. Upload to S3:
   - Medium: `s3://vehicle-guesser-1764962592/images/vehicles/medium/`
   - Hard: `s3://vehicle-guesser-1764962592/images/vehicles/hard/`

## AWS CLI Upload Command
```bash
# Medium
aws s3 cp alfa-romeo-giulia-2022-grille.jpg s3://vehicle-guesser-1764962592/images/vehicles/medium/

# Hard
aws s3 cp ferrari-488-2020-exhaust.jpg s3://vehicle-guesser-1764962592/images/vehicles/hard/
```
