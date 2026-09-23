# Artanis × Triania: Übergabe aus den bereitgestellten Dokumenten

Stand: 23. September 2026. Diese Notiz bewahrt die Produktvorgaben für die **spätere, separate Plattformphase**. Sie ist keine Aussage darüber, welche Base44-Funktionen bereits zuverlässig laufen. Erst den angekündigten Projektexport prüfen, dann den Neubau und die Anbindung planen. Character Studio bleibt die eigenständige Engine.

## Quellen und Verlässlichkeit

- `markdown (2).md eingefügt`: ausführlicher Plattformauftrag mit 70 Abschnitten und anschließendem Base44-Verlauf. Die ersten 70 Abschnitte sind Anforderungen und Entwurf. Die Antworten von Base44 sind Behauptungen über Implementierung; sie müssen gegen den Export und durch Funktionstests geprüft werden.
- `Base44 Charakter-Datenmodell und Prompt.docx`: kleiner Entwurf für `Character` mit `id`, `name`, `role`, `level`, `attributes`, `abilities`, `avatar_url` und `bio`. Beispielwerte sind keine bestätigten Produktionsdaten. Beim Import mit dem reicheren Character-Studio-Modell abgleichen.
- `Kostenlose NSFW-KI-Modelle erstellen.docx`: Gesprächsnotizen mit Ideen zu Figuren, kurzen Story-Etappen und Minispielen. Der Text enthält private und intime Schilderungen über Dritte. Keine Namen, Biografien oder Szenen daraus ungeprüft als Produktdaten übernehmen. Technische Provider-Aussagen daraus sind unbestätigte Vorschläge.

## Produktkern aus dem Plattformauftrag

- Drei klar getrennte Creator-Personas: Artanis, Triania und gemeinsamer Couple-Bereich. Nur volljährige Nutzer, erwachsene Charaktere und verifizierte reale Creator. Der frühe Auftrag nennt Artanis 44 und Triania 29; eine spätere Base44-Antwort nennt Triania 32. Alter und Profildaten vor produktiver Übernahme anhand des Exports und der Vorgaben des Nutzers bestätigen.
- Premium-Dark-Design, zuerst mobil; Landingpage, Creator-Profile, Explore, Live, Interactive, Videos, Photos, Stories, Topics, Requests, Messages, Library, Account und Admin. Leere Bereiche sollen klar deaktiviert oder verborgen sein; sichtbare Funktionen sollen tatsächlich funktionieren.
- Inhalte und Medien besitzen Creator, Typ, Topics, Sichtbarkeit, Veröffentlichung, Vorschau und Zugriffsregeln. Start weitgehend kostenlos; VIP, PPV, Trinkgelder und Zahlungsabwicklung sind spätere Phasen, für die das Datenmodell vorbereitet sein soll.
- Interaktive Experiences aus Levels, Auswahlpunkten, Medienvarianten, Fortschritt und kurzen Minispielen. Storys, Szenarien und Nachrichten sollen dieselben Character- und Kontextdaten nutzen.
- Private Räume mit Einladungslink und zeitlich begrenztem Zugriff. Zuschauer treten zunächst ohne Kamera und Mikrofon bei; Freigaben, Entfernen, Stummschalten und Blockieren liegen beim Host. Videochat und Zahlung wurden später ausdrücklich als gewünschte Ausbauschritte genannt; die technische Umsetzung im Base44-Projekt ist nicht verifiziert.
- KI-Modi für Artanis, Triania und Couple; AI-Nachrichten sind sichtbar als AI markiert. Vorproduzierte Interaktion darf nie als echter Livestream erscheinen. Medien dürfen nur gemäß expliziter Freigabe empfohlen, versendet oder verkauft werden.
- Spätere Chatwünsche: Auswahl des Persona-Modus, Story-Kontext, optionale Referenzbilder, Aktionen/Szenen in `<>` statt gesprochener Nachricht, auswählbare szenenabhängige Optionen und mehrere Interessen gleichzeitig. Das sind gewünschte Verhaltensweisen, kein Beleg für eine funktionierende Engine.
- Privatheit: private Originaldateien, kontrollierte temporäre Medienzugriffe, keine öffentlichen bürgerlichen Daten, keine EXIF-/GPS- oder internen Speicherpfade. Nutzung realer Personen und ihrer Bildreferenzen nur nach gesicherter Einwilligung. Separate Prüfung für Altersnachweis, Darstellerfreigabe, Rechte, Rollen und Medienzugriff.

## Übernahme in die Roadmap

1. Den angekündigten Base44-Export und Screenshots inventarisieren: Routen, Datenmodelle, Assets, echte Interaktionen, externe Verbindungen, Konfiguration und bekannte Fehler. Keine Base44-Erfolgsmeldung ohne Test übernehmen.
2. Widersprüche und Lücken mit dem Nutzer klären: insbesondere Alter/Profilangaben, Rechte an Referenzbildern, erste tatsächlich benötigte Funktionen, Videochat- und Zahlungsanbieter. Keine privaten Drittpersonen aus Gesprächsnotizen automatisch importieren.
3. Artanis × Triania als eigenes Produkt mit eigener 0–100-%-Roadmap führen. Vorhandene Character-Studio-Funktionen für Characters, Conversation, Memory, Media und Provider nur über definierte Schnittstellen anbinden. Produktspezifische Rollen, Entitlements, Rooms, Content und Payments getrennt modellieren.
4. Für jeden übernommenen Bereich Nutzerfluss und Berechtigungen testen. Bei fehlenden externen Diensten ehrlichen Demo-Modus kennzeichnen. Veröffentlichen erst nach gesonderter Prüfung der produktiven Alters-, Medien- und Zahlungsabläufe.

## Noch nicht verifiziert

Der Base44-Verlauf nennt bereits erstellte Profile, Medienseiten, Messages, KI-Modi, Admin-Funktionen und Demodaten. Ohne den Export ist weder der Code noch dessen Betriebszustand belegt. Diese Notiz setzt den Plattformfortschritt deshalb weiterhin auf **0 % geprüfter Neubau/Anbindung**.
