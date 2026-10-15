const API_ROOT = "https://esb.optimalwayconsulting.com/fbib/1/jR4rgA5K6Chhh5vyfrxo9wTScdg2NT7K";

function decodeResponse(text) {
  const json = JSON.parse(Buffer.from(text.trim(), "base64").toString("utf8"));
  if (json.result !== "OK") throw new Error(json.message || "Respuesta FBIB no válida");
  return Array.isArray(json.messageData) ? json.messageData : [];
}

async function getMatches(path) {
  const response = await fetch(`${API_ROOT}/${path}`, {
    headers: { Accept: "text/plain" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`FBIB respondió ${response.status}`);
  return decodeResponse(await response.text());
}

function normalize(match, extra = false) {
  return {
    id: String(match.idMatch),
    team: String(extra ? "10594" : match.idLocalClub === "147" ? match.idLocalTeam : match.idVisitorTeam),
    date: String(match.matchDay || "").replace(" ", "T").slice(0, 16),
    home: match.nameLocalTeam || "Equipo local",
    away: match.nameVisitorTeam || "Equipo visitante",
    hs: match.localScore == null || match.localScore === "" ? null : Number(match.localScore),
    as: match.visitorScore == null || match.visitorScore === "" ? null : Number(match.visitorScore),
    venue: match.nameField || "Pabellón pendiente de confirmar",
    category: match.nameCategorySigned || match.nameCategory || "Baloncesto",
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // FBIB expone cada calendario por mes. Consultamos los doce para incluir
    // resultados anteriores y horarios futuros de toda la temporada.
    const months = Array.from({ length: 12 }, (_, index) => index + 1);
    const [clubByMonth, linkedTeamByMonth] = await Promise.all([
      Promise.all(months.map(month => getMatches(`Match/getMatchClubMonth/147/${month}/B`))),
      Promise.all(months.map(month => getMatches(`Match/getByTeamAndMonth/10594/${month}`))),
    ]);
    const matches = [...clubByMonth.flat().map(match => normalize(match)),
      ...linkedTeamByMonth.flat().map(match => normalize(match, true))];
    const unique = [...new Map(matches.filter(match => match.date && match.id !== "undefined")
      .map(match => [match.id, match])).values()].sort((a, b) => a.date.localeCompare(b.date));
    return res.status(200).json({ matches: unique, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("No se pudo actualizar el calendario FBIB:", error);
    return res.status(502).json({ error: "No se han podido consultar los datos de FBIB." });
  }
};
