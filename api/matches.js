const { loadMatches } = require("../lib/matches");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    return res.status(200).json({ matches: await loadMatches(), updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("No se pudo actualizar el calendario FBIB:", error);
    return res.status(502).json({ error: "No se han podido consultar los datos de FBIB." });
  }
};
