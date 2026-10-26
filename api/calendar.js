const { loadMatches } = require("../lib/matches");

const TEAM_NAMES = {
  "10829": "Cadet femení", "11327": "Iniciació", "10454": "Júnior masculí",
  "10666": "Infantil femení", "11077": "Mini femení", "11075": "Mini masculí A",
  "11076": "Mini masculí B", "11325": "Premini masculí", "11326": "Premini femení",
  "10668": "Infantil masculí", "10594": "FERREDELLA · Júnior femení",
};
const TIME_ZONE = "Europe/Madrid";

function escapeIcs(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function localDateToUtc(value) {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour || 0, minute || 0);
  let guess = target;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  for (let i = 0; i < 2; i++) {
    const values = Object.fromEntries(parts.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    guess += target - represented;
  }
  return new Date(guess);
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function foldLine(line) {
  const chunks = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > 73) {
      chunks.push(current);
      current = ` ${char}`;
    } else current += char;
  }
  chunks.push(current);
  return chunks.join("\r\n");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="cb-ferreries.ics"');
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Método no permitido");
  }

  try {
    const query = req.query?.teams || "all";
    const requested = String(Array.isArray(query) ? query.join(",") : query).split(",").filter(Boolean);
    const selected = requested.includes("all") ? Object.keys(TEAM_NAMES) : requested.filter(id => TEAM_NAMES[id]);
    if (!selected.length) return res.status(400).send("Selecciona al menos un equipo válido.");

    const matches = await loadMatches();
    const now = Date.now();
    const events = matches.filter(match => selected.includes(match.team) && localDateToUtc(match.date).getTime() >= now - 86400000);
    const calendarName = selected.map(id => TEAM_NAMES[id]).join(", ");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CB Ferreries//Calendari de partits//CA",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeIcs(`CB Ferreries · ${calendarName}`)}`,
      `X-WR-TIMEZONE:${TIME_ZONE}`,
    ];

    for (const match of events) {
      const start = localDateToUtc(match.date);
      const end = new Date(start.getTime() + 90 * 60 * 1000);
      const status = match.hs == null ? "Programat" : `Resultat: ${match.hs}–${match.as}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${escapeIcs(match.id)}@cbferreries.vercel.app`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${escapeIcs(`${match.category}: ${match.home} – ${match.away}`)}`,
        `DESCRIPTION:${escapeIcs(`${match.category} · ${status} · Dades de la Federació de Bàsquet de les Illes Balears`)}`,
        `LOCATION:${escapeIcs(match.venue)}`,
        `URL:https://www.fbib.es/partido/${encodeURIComponent(match.id)}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return res.status(200).send(`${lines.map(foldLine).join("\r\n")}\r\n`);
  } catch (error) {
    console.error("No se pudo generar el calendario ICS:", error);
    return res.status(502).send("No se ha podido consultar el calendario oficial.");
  }
};
