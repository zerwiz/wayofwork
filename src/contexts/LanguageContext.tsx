import React, { createContext, useContext, useState, useEffect } from "react";
import sv from "../i18n/sv.json";
import en from "../i18n/en.json";

type Language = "sv" | "en";
type Translations = typeof sv;

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = { sv, en };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [language, setLanguageState] = useState<Language>(() => {
		const saved = localStorage.getItem("wop_language");
		return (saved as Language) || "sv";
	});

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
		localStorage.setItem("wop_language", lang);
	};

	const t = (keyPath: string): string => {
		const keys = keyPath.split(".");
		let current: any = translations[language];
		for (const key of keys) {
			if (current[key] === undefined) {
				return keyPath; // Fallback to key path if translation missing
			}
			current = current[key];
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
