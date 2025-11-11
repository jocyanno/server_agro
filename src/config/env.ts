import dotenv from "dotenv";

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || ""
  },
  cemaden: {
    apiTokenUrl: process.env.URL_CEMADEN_GET_TOKEN || "",
    user: process.env.CEMADEN_USER || "",
    password: process.env.CEMADEN_USER_PASS || "",
    codibge: 2610004,
    stations: [
      {
        codestacao: "261000402A",
        id_tipoestacao: 1,
        nome: "Japaranduba"
      },
      {
        codestacao: "261000403A",
        id_tipoestacao: 1,
        nome: "SANTO ANTÔNIO DOS PALMARES - APAC"
      }
    ]
  }
};
