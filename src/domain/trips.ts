export type Trip = {
  id: string;
  lineCode: string;
  lineName: string;
  departureTime: string;
  direction: string;
};

export type CreateTripInput = {
  lineCode: string;
  lineName: string;
  departureTime: string;
  direction?: string;
};
