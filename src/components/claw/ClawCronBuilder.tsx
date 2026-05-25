import React from "react";

interface CronBuilderProps {
	dark: boolean;
	value: string;
	onChange: (value: string) => void;
}

export function ClawCronBuilder({ dark, value, onChange }: CronBuilderProps) {
	// A simple cron builder that allows choosing time and frequency
    // For now, let's just make it a simple text input with a helper label,
    // until we can implement a full visual cron builder.
	return (
		<div className="mt-2 space-y-2">
			<input
				type="text"
				className={`w-full rounded border p-2 font-mono ${
					dark ? "border-gray-700 bg-gray-900 text-white" : "border-gray-300 bg-white text-black"
				}`}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="e.g., 0 0 * * *"
			/>
            <p className="text-xs text-gray-500">
                Format: minute hour day month weekday (e.g., 0 18 * * * for 6 PM daily)
            </p>
		</div>
	);
}
