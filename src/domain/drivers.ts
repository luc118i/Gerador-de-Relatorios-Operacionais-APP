export type Driver = {
  id: string;
  code: string; // matrícula
  name: string;
  base: string | null;
};

export type CreateDriverInput = {
  code: string;
  name: string;
  base?: string | null;
};
