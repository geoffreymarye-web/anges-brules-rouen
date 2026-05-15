export const LOCATIONS = [
  { id: 1, name: 'Cathédrale', lat: 49.4403, lng: 1.0943, radius: 30 },
  { id: 2, name: 'Square Verdrel', lat: 49.4428, lng: 1.0922, radius: 30 },
  { id: 3, name: 'CHU Charles Nicolle', lat: 49.4446, lng: 1.0891, radius: 40 },
  { id: 4, name: 'Aître Saint-Maclou', lat: 49.4416, lng: 1.0968, radius: 25 },
  { id: 5, name: 'Gare Rive-Droite', lat: 49.4434, lng: 1.0889, radius: 40 },
  { id: 6, name: 'Gros-Horloge', lat: 49.4407, lng: 1.0924, radius: 25 },
  { id: 7, name: 'Place du Vieux-Marché', lat: 49.4428, lng: 1.0889, radius: 35 },
  { id: 8, name: 'Rue Beauvoisine', lat: 49.4451, lng: 1.0927, radius: 30 },
  { id: 9, name: 'Quais de Seine', lat: 49.4388, lng: 1.0924, radius: 40 },
  { id: 10, name: 'Dénouement', lat: 49.4403, lng: 1.0889, radius: 30 },
] as const;

export type Location = typeof LOCATIONS[number];
