UPDATE: DIPLOMACY, PVO AND DYNAMIC OCCUPATION

Diplomacy:
- Talk, trade, gifts and diplomatic meetings improve bilateral relations.
- Relations at -100 trigger war automatically when fewer than two active fronts exist.
- The AI also checks legacy saves for relations already at -100.

Army / air defense:
- Added a direct PVO deployment action to the Army tab.
- Deployment costs 500 million and 2 equipment; it increases the AA inventory used by the existing air-defense interception system.
- Existing arsenal PVO units and wartime PVO positions remain compatible.

War and economy:
- Enemy-held occupied regions provide temporary monthly revenue while they remain under control.
- When the AI gains the initiative, it can occupy a player region. The region is marked as occupied and the national GDP is reduced immediately.
- Successful player counterattacks can liberate occupied regions and restore the recorded GDP loss.
- Occupation state is stored in the existing save object and survives reloads.

Compatibility:
- No save reset or schema migration is required; new fields are initialized lazily.
- Existing diplomacy, war fronts, AI arsenal, economy and region systems are retained.
