// Sample/simulated data for the app

export const VESSELS = [
    'Aegir',
    'Afina',
    'Barla',
    'Dian Dian',
    'Ilker Deniz',
    'Nimba-1',
    'Nimba-2',
    'Nimba-3',
    'Nimba-4'
];

export const TAGS = [
    'Cargo Ops',
    'Waiting',
    'Transit',
    'Maintenance',
    'Bunkering',
    'Anchored',
    'Weather Delay',
    'Port Stay',
    'Other'
];

// Generate simulated hourly rain data (24 hours)
export function generateHourlyRain() {
    const data = [];
    for (let h = 0; h < 24; h++) {
        // Pattern: heavier rain early morning, lighter midday, picks up evening
        let base;
        if (h < 9) base = 5 + Math.random() * 2;
        else if (h < 15) base = 1 + Math.random() * 3;
        else base = 2 + Math.random() * 4;
        data.push(Math.round(base * 10) / 10);
    }
    return data;
}

// Generate simulated 7-day rain data
export function generateWeeklyRain() {
    const data = [];
    const today = new Date();
    for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        data.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            value: Math.round((20 + Math.random() * 80) * 10) / 10
        });
    }
    return data;
}

// Generate simulated tide data for a location
export function generateTideData(location) {
    const tides = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Conakry: higher tidal range; Kamsar: slightly different timing
    const baseOffset = location === 'Conakry' ? 0 : 1.5;
    const highBase = location === 'Conakry' ? 4.2 : 3.8;
    const lowBase = location === 'Conakry' ? 0.8 : 1.0;

    for (let day = 0; day < 7; day++) {
        const d = new Date(today);
        d.setDate(today.getDate() + day);

        // Two high tides and two low tides per day (semidiurnal)
        const times = [
            { hour: 1 + baseOffset + Math.random() * 2, type: 'Low' },
            { hour: 7 + baseOffset + Math.random() * 1.5, type: 'High' },
            { hour: 13 + baseOffset + Math.random() * 2, type: 'Low' },
            { hour: 19 + baseOffset + Math.random() * 1.5, type: 'High' }
        ];

        times.forEach(t => {
            const tideDate = new Date(d);
            const hour = Math.floor(t.hour);
            const min = Math.floor((t.hour - hour) * 60);
            tideDate.setHours(hour, min, 0, 0);

            const height = t.type === 'High'
                ? highBase + (Math.random() - 0.5) * 1.2
                : lowBase + (Math.random() - 0.5) * 0.5;

            tides.push({
                dateTime: tideDate.toLocaleString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                height: Math.round(height * 100) / 100,
                type: t.type
            });
        });
    }

    return tides;
}
