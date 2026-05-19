import { useState, useEffect } from "react";
import { X, Clock, FileText, Calendar as CalendarIcon, Save } from "lucide-react";
import type { BoardCard } from "../../types/kanban";

interface WorkLogActivityModalProps {
	isOpen: boolean;
	onClose: () => void;
	cards: BoardCard[];
	onLog: (cardId: string, hours: number, description: string, date: string) => Promise<void>;
	appearanceDark?: boolean;
	initialCardId?: string | null;
}

export function WorkLogActivityModal({
	isOpen,
	onClose,
	cards,
	onLog,
	appearanceDark = true,
	initialCardId = null,
}: WorkLogActivityModalProps) {
	const [selectedCardId, setSelectedCardId] = useState(initialCardId || "");
	const [hours, setHours] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
	const [submitting, setSubmitting] = useState(false);

	// Sync pre-selected card if prop changes
	useEffect(() => {
		if (initialCardId) setSelectedCardId(initialCardId);
	}, [initialCardId]);

	if (!isOpen) return null;

	const bg = appearanceDark ? "bg-[#1e1e1e]" : "bg-white";
	const panelBg = appearanceDark ? "bg-[#252526]" : "bg-[#f5f5f5]";
	const border = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const text = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const label = appearanceDark ? "text-[#858585]" : "text-[#666666]";
	const input = appearanceDark 
		? "bg-[#2d2d2d] border-[#3c3c3c] text-white focus:border-[#ea580c]" 
		: "bg-white border-[#e5e5e5] text-[#333] focus:border-[#ea580c]";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCardId || !hours || !description || !date) return;
		
		setSubmitting(true);
		try {
			await onLog(selectedCardId, parseFloat(hours), description, date);
			onClose();
			// Reset form
			setSelectedCardId("");
			setHours("");
			setDescription("");
		} catch (err) {
			console.error("Failed to log activity", err);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
			
			<div className={`relative w-full max-w-md overflow-hidden rounded-xl border ${border} ${bg} shadow-2xl animate-in fade-in zoom-in duration-200`}>
				<div className={`flex items-center justify-between border-b ${border} px-4 py-3 ${panelBg}`}>
					<div className="flex items-center gap-2">
						<Clock size={18} className="text-[#fb923c]" />
						<h2 className={`text-sm font-bold uppercase tracking-tight ${text}`}>Log Work Activity</h2>
					</div>
					<button onClick={onClose} className={`${label} hover:text-[#cccccc]`}>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					<div className="rounded-lg bg-[#ea580c]/5 border border-[#ea580c]/20 p-2.5 mb-2">
						<p className="text-[10px] text-[#ea580c] font-medium leading-snug">
							<Clock size={10} className="inline mr-1 mb-0.5" />
							Linked to Workbot: These entries automatically sync with your WhatsApp time-reporting feed.
						</p>
					</div>

					<div>
						<label className={`block text-[10px] font-bold uppercase tracking-widest ${label} mb-1.5`}>
							Select Planning Task
						</label>
						<select
							required
							value={selectedCardId}
							onChange={(e) => setSelectedCardId(e.target.value)}
							className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${input}`}
						>
							<option value="">-- Choose a task --</option>
							{cards.map(card => (
								<option key={card.id} value={card.id}>{card.title}</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className={`block text-[10px] font-bold uppercase tracking-widest ${label} mb-1.5`}>
								Hours
							</label>
							<div className="relative">
								<Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#585858]" />
								<input
									required
									type="number"
									step="0.5"
									min="0.1"
									value={hours}
									onChange={(e) => setHours(e.target.value)}
									placeholder="1.5"
									className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-all ${input}`}
								/>
							</div>
						</div>
						<div>
							<label className={`block text-[10px] font-bold uppercase tracking-widest ${label} mb-1.5`}>
								Date
							</label>
							<div className="relative">
								<CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#585858]" />
								<input
									required
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-all ${input}`}
								/>
							</div>
						</div>
					</div>

					<div>
						<label className={`block text-[10px] font-bold uppercase tracking-widest ${label} mb-1.5`}>
							Activity Description
						</label>
						<div className="relative">
							<FileText size={14} className="absolute left-3 top-3 text-[#585858]" />
							<textarea
								required
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What did you work on?"
								rows={3}
								className={`w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-all ${input} resize-none`}
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="w-full rounded-lg bg-[#ea580c] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#ea580c]/20 hover:bg-[#c2410c] active:scale-[0.98] transition-all disabled:opacity-50"
					>
						{submitting ? "Saving..." : "Save Activity Log"}
					</button>
				</form>
			</div>
		</div>
	);
}
