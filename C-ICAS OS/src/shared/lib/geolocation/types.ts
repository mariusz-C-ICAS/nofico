export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoAddress {
  formattedAddress: string;
  city?: string;
  postalCode?: string;
  country?: string;
  streetNumber?: string;
  route?: string;
}
