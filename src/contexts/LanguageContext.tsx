import React, { createContext, useContext, useState, useEffect } from "react";
import sv from "../i18n/sv.json";
import en from "../i18n/en.json";

type Language = "sv" | "en";
type Translations = typeof sv;

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = { sv, en };

async function saveLanguageToServer(lang: Language) {
	try {
		const token = localStorage.getItem("wop_token");
		if (!token) return;
		await fetch("/api/portal/me", {
			method: "PUT",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ language: lang }),
		});
	} catch { /* non-fatal */ }
}

async function loadLanguageFromServer(): Promise<Language | null> {
	try {
		const token = localStorage.getItem("wop_token");
		if (!token) return null;
		const res = await fetch("/api/portal/me", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return null;
		const user = await res.json();
		if (user.language === "sv" || user.language === "en") return user.language;
		return null;
	} catch { return null; }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [language, setLanguageState] = useState<Language>(() => {
		const saved = localStorage.getItem("wop_language");
		return (saved as Language) || "sv";
	});

	useEffect(() => {
		loadLanguageFromServer().then((lang) => {
			if (lang && lang !== language) {
				setLanguageState(lang);
				localStorage.setItem("wop_language", lang);
			}
		});
	}, []);

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
		localStorage.setItem("wop_language", lang);
		saveLanguageToServer(lang);
	};

	const t = (keyPath: string, vars?: Record<string, string | number>): string => {
		const keys = keyPath.split(".");
		let current: any = translations[language];
		for (const key of keys) {
			if (current[key] === undefined) {
				return keyPath;
			}
			current = current[key];
		}
		if (vars && typeof current === "string") {
			let result = current as string;
			for (const [k, v] of Object.entries(vars)) {
				result = result.replaceAll(`{${k}}`, String(v));
			}
			return result;
		}
		return current;
	};

	return (
		<LanguageContext.Provider value={{ language, setLanguage, t }}>
			{children}
		</LanguageContext.Provider>
	);
};

export const useTranslation = () => {
	const context = useContext(LanguageContext);
	if (context === undefined) {
		throw new Error("useTranslation must be used within a LanguageProvider");
	}
	return context;
};
