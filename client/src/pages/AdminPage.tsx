import { useEffect, useState } from "react";
import { movieApi } from "@/api/movieApi";
import type { Movie } from "@/types/index";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Card,
  CardBody,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import {
  Edit, Trash2, Lock, LayoutDashboard, ExternalLink, Plus, X,
  Wand2, Search, RefreshCw, FileText, Cpu, ChevronDown, ChevronUp,
  Save, CheckCircle, AlertTriangle, GitMerge
} from "lucide-react";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [tmdbUrl, setTmdbUrl] = useState("");
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkLog, setBulkLog] = useState<{ title: string; status: string }[]>([]);
  const [bulkSummary, setBulkSummary] = useState<{ updated: number; failed: number; total: number } | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [activeTab, setActiveTab] = useState<"library" | "manual-parser">("library");
  const [manualText, setManualText] = useState("");
  const [manualParsing, setManualParsing] = useState(false);
  const [manualPreview, setManualPreview] = useState<any>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualTmdbUrl, setManualTmdbUrl] = useState("");
  const [manualTmdbLoading, setManualTmdbLoading] = useState(false);

  const [existingMatches, setExistingMatches] = useState<Movie[]>([]);
  const [selectedMergeId, setSelectedMergeId] = useState<string | "NEW" | null>(null);
  const [parserConfidence, setParserConfidence] = useState<"High" | "Medium" | "Low">("High");
  const [tmdbCandidates, setTmdbCandidates] = useState<any[]>([]);
  const [tmdbPickerOpen, setTmdbPickerOpen] = useState(false);
  const [tmdbPickerLoading, setTmdbPickerLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const savedPass = localStorage.getItem("admin_pass");
      if (savedPass) {
        try {
          await movieApi.verifyAdmin(savedPass);
          setPassword(savedPass);
          setIsLoggedIn(true);
          fetchMovies(savedPass);
        } catch (error) {
          localStorage.removeItem("admin_pass");
        }
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await movieApi.verifyAdmin(password);
      localStorage.setItem("admin_pass", password);
      setIsLoggedIn(true);
      fetchMovies(password);
    } catch (error: any) {
      alert(error.response?.data?.message || "Authentication failed");
    }
  };

  const fetchMovies = async (pass?: string, search?: string) => {
    setLoading(true);
    try {
      const data = await movieApi.getMovies({ limit: 100, search: search || undefined });
      setMovies(data.movies);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setTimeout(() => {
      fetchMovies(password, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this movie?")) return;
    try {
      await movieApi.deleteMovie(id, password);
      setMovies(movies.filter((m) => m._id !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const handleEdit = (movie: Movie) => {
    setSelectedMovie({ ...movie });
    setTmdbUrl("");
    onOpen();
  };

  const handleTmdbAutofill = async () => {
    if (!selectedMovie || !tmdbUrl.trim()) return;
    setTmdbLoading(true);
    try {
      const data = await movieApi.fetchFromTmdb(tmdbUrl.trim(), password);
      setSelectedMovie((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(data.title      && { title:         data.title }),
                       ...(data.originalTitle && { originalTitle: data.originalTitle }),
                       ...(data.poster     && { poster:     data.poster }),
                       ...(data.backdrop   && { backdrop:   data.backdrop }),
                       ...(data.rating     && { rating:     data.rating }),
                       ...(data.runtime    && { runtime:    data.runtime }),
                       ...(data.country    && { country:    data.country }),
                       ...(data.director   && { director:   data.director }),
                       ...(data.year       && { year:       data.year }),
                       ...(data.audio      && { audio:      data.audio }),
                       ...(data.audio?.length && { audio: data.audio }),
                       ...(data.description && { description: data.description }),
                       ...(data.genre?.length && { genre:  data.genre }),
                       ...(data.cast?.length  && { cast:   data.cast }),
        };
      });
      setTmdbUrl("");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to fetch from TMDB");
    } finally {
      setTmdbLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!window.confirm("This will fetch descriptions from TMDB for all entries missing one. Continue?")) return;
    setBulkRunning(true);
    setBulkLog([]);
    setBulkSummary(null);
    try {
      await movieApi.bulkUpdateDescriptions(password, (line) => {
        if (line.type === "progress") {
          setBulkLog((prev) => [...prev, { title: line.title!, status: line.status! }]);
        } else if (line.type === "done") {
          setBulkSummary({ updated: line.updated!, failed: line.failed!, total: line.total! });
        }
      });
    } catch (e: any) {
      alert("Bulk update failed: " + e.message);
    } finally {
      setBulkRunning(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMovie) return;
    try {
      await movieApi.updateMovie(selectedMovie._id, selectedMovie, password);
      setMovies(movies.map(m => m._id === selectedMovie._id ? selectedMovie : m));
      onOpenChange();
    } catch (error) {
      alert("Update failed");
    }
  };

  const addLink = () => {
    if (!selectedMovie) return;
    const newLinks = [...(selectedMovie.links || []), { label: "New Link", url: "", quality: "", size: "" }];
    setSelectedMovie({ ...selectedMovie, links: newLinks });
  };

  const removeLink = (index: number) => {
    if (!selectedMovie) return;
    const newLinks = [...selectedMovie.links];
    newLinks.splice(index, 1);
    setSelectedMovie({ ...selectedMovie, links: newLinks });
  };

  const updateLink = (index: number, field: string, value: any) => {
    if (!selectedMovie) return;
    const newLinks = [...selectedMovie.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setSelectedMovie({ ...selectedMovie, links: newLinks });
  };

  const calculateConfidence = (data: any) => {
    let score = 0;
    if (data.title) score += 30;
    if (data.year) score += 20;
    if (data.links?.length > 0) score += 30;
    if (data.type) score += 20;
    if (score >= 80) return "High";
    if (score >= 50) return "Medium";
    return "Low";
  };

  const formatParsedLinks = (links: any[], rawText: string) => {
    if (!links) return [];
    const textLower = rawText.toLowerCase();

    return links.map(link => {
      const urlText = (link.url || "").toLowerCase();
      const labelLower = (link.label || "").toLowerCase();
      const fullStr = `${link.label || ''} ${link.filename || ''} ${link.url || ''}`.toUpperCase();

      const isPackage = /batch|complete|zip/i.test(urlText) ||
      /batch|complete|zip/i.test(labelLower) ||
      /batch|complete|zip/i.test(textLower);

      let newLabel = link.label;
      let ep = link.episode;

      // RIGOROUS FAKE EPISODE SCRUBBER
      if (ep) {
        // If there is no explicit text saying "E05", "EP5", "Episode 5", we scrutinize the number
        const hasExplicitEp = /(?:EP|E|EPISODE|S\d+E)\s*0*\d+\b/i.test(fullStr);
        if (!hasExplicitEp) {
          const epNum = Number(ep);
          if (epNum === 5 && fullStr.includes("ZEE5")) ep = null;
          if ([264, 265, 266].includes(epNum) && /H\.?26[456]|X26[456]/i.test(fullStr)) ep = null;
          if ([2, 5, 7].includes(epNum) && /(?:2\.0|5\.1|7\.1)/.test(fullStr)) ep = null;
          if ([720, 1080, 2160, 480].includes(epNum)) ep = null;
        }
      }

      if (isPackage) {
        ep = null;
      }

      if (isPackage || (link.season && !ep)) {
        newLabel = `Season ${link.season || 1}`;
      } else if (link.season && ep) {
        newLabel = `S${String(link.season).padStart(2, '0')}E${String(ep).padStart(2, '0')}`;
      } else if (!link.season && !ep && isPackage) {
        newLabel = "Season 1";
      }

      return { ...link, label: newLabel, episode: ep };
    });
  };

  const handleManualParse = async () => {
    if (!manualText.trim()) return;
    setManualParsing(true);
    setManualPreview(null);
    setManualSaved(false);
    setExistingMatches([]);
    setSelectedMergeId(null);
    setTmdbCandidates([]);
    setTmdbPickerOpen(false);

    try {
      const result = await movieApi.parseManual(manualText, password);
      const parsedData = result.data;

      parsedData.links = formatParsedLinks(parsedData.links, manualText);

      const conf = calculateConfidence(parsedData);
      setParserConfidence(conf);
      if (conf !== "High") setManualEditMode(true);

      // Use server-returned DB matches (already filtered by title + year)
      const dbMatches: Movie[] = (result as any).dbMatches || [];
      setExistingMatches(dbMatches);
      setSelectedMergeId(dbMatches.length > 0 ? null : "NEW");

      // TMDB candidates — show picker if more than 1
      const candidates = (result as any).tmdbCandidates || [];
      setTmdbCandidates(candidates);
      if (candidates.length > 1) setTmdbPickerOpen(true);

      setManualPreview(parsedData);
    } catch (error: any) {
      alert(error.response?.data?.message || "Parse failed");
    } finally {
      setManualParsing(false);
    }
  };

  /** Called when admin picks a TMDB candidate from the picker */
  const handleTmdbCandidatePick = async (candidate: any) => {
    setTmdbPickerLoading(true);
    try {
      const details = await movieApi.fetchTmdbById(candidate.tmdbId, candidate.tmdbType, password);
      // Merge TMDB details into preview, preserving user-supplied links/audio/type
      setManualPreview((prev: any) => ({
        ...prev,
        ...details,
        audio: prev.audio?.length ? prev.audio : [],
        type: prev.type,
        links: prev.links,
        link: prev.links?.[0]?.url || '',
      }));
      setTmdbPickerOpen(false);
    } catch (e: any) {
      alert("Failed to fetch TMDB details: " + (e.response?.data?.message || e.message));
    } finally {
      setTmdbPickerLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualPreview) return;
    setManualSaving(true);
    try {
      if (selectedMergeId && selectedMergeId !== "NEW") {
        const existingTarget = movies.find(m => m._id === selectedMergeId);
        if (!existingTarget) throw new Error("Merge target not found");

        const mergedLinks = [...(existingTarget.links || [])];

        (manualPreview.links || []).forEach((newLink: any) => {
          const duplicateIdx = mergedLinks.findIndex(existing =>
          existing.label === newLink.label && existing.quality === newLink.quality
          );

          if (duplicateIdx !== -1) {
            mergedLinks[duplicateIdx] = newLink;
          } else {
            mergedLinks.push(newLink);
          }
        });

        const updatedData = {
          ...existingTarget,
          description: existingTarget.description || manualPreview.description,
          poster: existingTarget.poster || manualPreview.poster,
          backdrop: existingTarget.backdrop || manualPreview.backdrop,
          links: mergedLinks
        };

        await movieApi.updateMovie(existingTarget._id, updatedData, password);
      } else {
        await movieApi.saveManual({ ...manualPreview, rawMessage: manualText }, password);
      }

      setManualSaved(true);
      setManualPreview(null);
      setManualText("");
      await fetchMovies(password);
      setTimeout(() => setManualSaved(false), 4000);
    } catch (error: any) {
      alert(error.response?.data?.message || "Save failed");
    } finally {
      setManualSaving(false);
    }
  };

  const updateManualLink = (idx: number, field: string, value: any) => {
    if (!manualPreview) return;
    const newLinks = [...(manualPreview.links || [])];
    newLinks[idx] = { ...newLinks[idx], [field]: value };
    setManualPreview({ ...manualPreview, links: newLinks });
  };

  const removeManualLink = (idx: number) => {
    if (!manualPreview) return;
    const newLinks = [...(manualPreview.links || [])];
    newLinks.splice(idx, 1);
    setManualPreview({ ...manualPreview, links: newLinks });
  };

  const addManualLink = () => {
    if (!manualPreview) return;
    setManualPreview({
      ...manualPreview,
      links: [...(manualPreview.links || []), { label: "Season 1", url: "", quality: "", size: "", season: null, episode: null, filename: "" }],
    });
  };

  const handleManualTmdbOverride = async () => {
    if (!manualTmdbUrl.trim() || !manualPreview) return;
    setManualTmdbLoading(true);
    try {
      const data = await movieApi.fetchFromTmdb(manualTmdbUrl.trim(), password);
      setManualPreview((prev: any) => ({
        ...prev,
        ...(data.tmdbId      && { tmdbId:        data.tmdbId }),
                                       ...(data.title       && { title:          data.title }),
                                       ...(data.originalTitle && { originalTitle: data.originalTitle }),
                                       ...(data.poster      && { poster:         data.poster }),
                                       ...(data.backdrop    && { backdrop:       data.backdrop }),
                                       ...(data.rating      && { rating:         data.rating }),
                                       ...(data.runtime     && { runtime:        data.runtime }),
                                       ...(data.status      && { status:         data.status }),
                                       ...(data.country     && { country:        data.country }),
                                       ...(data.director    && { director:       data.director }),
                                       ...(data.year        && { year:           data.year }),
                                       ...(data.description && { description:    data.description }),
                                       ...(data.genre?.length  && { genre: data.genre }),
                                       ...(data.cast?.length   && { cast:  data.cast }),
                                       ...(data.type && { type: data.type }),
      }));
      setManualTmdbUrl("");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to fetch from TMDB");
    } finally {
      setManualTmdbLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
      <Card className="w-full max-w-md bg-white/5 border-white/10 p-4">
      <CardBody className="gap-6 py-8">
      <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center mb-2">
      <Lock className="w-8 h-8 text-brand" />
      </div>
      <h1 className="text-2xl font-display tracking-widest text-white">ADMIN ACCESS</h1>
      <p className="text-white/40 text-sm">Please enter the secret password</p>
      </div>
      <div className="space-y-4">
      <Input type="password" placeholder="Password" value={password} onValueChange={setPassword} className="bg-white/5" />
      <Button onPress={handleLogin} className="w-full bg-brand text-white font-bold h-12 rounded-xl">Authenticate</Button>
      </div>
      </CardBody>
      </Card>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-[#0a0a0a] min-h-screen">
    <div className="container mx-auto px-4">
    <div className="flex justify-between items-center mb-10">
    <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
    <LayoutDashboard className="w-6 h-6 text-white/60" />
    </div>
    <div>
    <h1 className="text-2xl font-display tracking-widest text-white">CONTENT MANAGER</h1>
    <p className="text-white/40 text-xs uppercase tracking-tighter">Total Items: {movies.length}</p>
    </div>
    </div>
    <div className="flex items-center gap-3">
    <Button variant="flat" isLoading={bulkRunning} onPress={handleBulkUpdate} startContent={!bulkRunning && <RefreshCw className="w-4 h-4" />} className="text-white/40 hover:text-brand border border-white/10 bg-white/5 text-xs">
    {bulkRunning ? "Updating…" : "Bulk Fix Descriptions"}
    </Button>
    <Button variant="flat" onPress={() => { localStorage.removeItem("admin_pass"); setIsLoggedIn(false); }} className="text-white/40 hover:text-red-400">Logout</Button>
    </div>
    </div>

    <div className="flex gap-2 mb-8 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
    <button onClick={() => setActiveTab("library")} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "library" ? "bg-brand text-white shadow" : "text-white/40 hover:text-white/70"}`}>
    <LayoutDashboard className="w-4 h-4" /> Library
    </button>
    <button onClick={() => setActiveTab("manual-parser")} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "manual-parser" ? "bg-brand text-white shadow" : "text-white/40 hover:text-white/70"}`}>
    <FileText className="w-4 h-4" /> Manual Parser
    </button>
    </div>

    {activeTab === "library" && (bulkLog.length > 0 || bulkSummary) && (
      <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
      {bulkSummary ? (
        <p className="text-sm font-bold text-white/70">✅ Done — <span className="text-green-400">{bulkSummary.updated} updated</span>{bulkSummary.failed > 0 && <span className="text-red-400"> · {bulkSummary.failed} failed</span>}<span className="text-white/30"> · {bulkSummary.total} total processed</span></p>
      ) : (
        <p className="text-xs text-white/30 uppercase tracking-widest">Updating descriptions…</p>
      )}
      <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
      {bulkLog.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
        <span className={entry.status === "updated" ? "text-green-400" : "text-red-400"}>{entry.status === "updated" ? "✓" : "✗"}</span>
        <span className="text-white/50 truncate">{entry.title}</span>
        <span className="text-white/20 ml-auto shrink-0">{entry.status}</span>
        </div>
      ))}
      </div>
      </div>
    )}

    {activeTab === "library" && (
      <div className="mb-6">
      <Input placeholder="Search by title..." value={searchQuery} onValueChange={setSearchQuery} startContent={<Search className="w-4 h-4 text-white/30 shrink-0" />} isClearable onClear={() => setSearchQuery("")} classNames={{ inputWrapper: "bg-white/5 border border-white/10 hover:border-white/20 focus-within:!border-brand/50 h-11", input: "text-sm text-white placeholder:text-white/20" }} />
      </div>
    )}

    {activeTab === "library" && (() => {
      const filtered = movies;
      return (
        <>
        <Table aria-label="Movie management table" classNames={{ base: "bg-white/5 border border-white/10 rounded-2xl overflow-hidden", header: "bg-white/10", th: "bg-transparent text-white/40 text-[11px] uppercase tracking-widest h-14 border-b border-white/10", td: "text-white/80 py-4" }}>
        <TableHeader>
        <TableColumn>MOVIE / SERIES</TableColumn>
        <TableColumn>YEAR</TableColumn>
        <TableColumn>TYPE</TableColumn>
        <TableColumn>LINKS</TableColumn>
        <TableColumn>ADDED ON</TableColumn>
        <TableColumn align="center">ACTIONS</TableColumn>
        </TableHeader>
        <TableBody loadingContent={<div>loading...</div>} isLoading={loading}>
        {filtered.map((movie) => (
          <TableRow key={movie._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
          <TableCell>
          <div className="flex items-center gap-3">
          <img src={movie.poster} className="w-10 h-14 object-cover rounded-md border border-white/10" alt="" />
          <span className="font-bold text-sm">{movie.title}</span>
          </div>
          </TableCell>
          <TableCell>{movie.year}</TableCell>
          <TableCell><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/10">{movie.type}</span></TableCell>
          <TableCell>{movie.links?.length || 0} Links</TableCell>
          <TableCell className="text-white/30 text-xs">{new Date(movie.addedAt).toLocaleDateString()}</TableCell>
          <TableCell>
          <div className="flex gap-2 justify-center">
          <Button isIconOnly variant="flat" size="sm" onPress={() => handleEdit(movie)} className="bg-white/5 hover:bg-blue-500/20 text-blue-400"><Edit className="w-4 h-4" /></Button>
          <Button isIconOnly variant="flat" size="sm" onPress={() => handleDelete(movie._id)} className="bg-white/5 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></Button>
          </div>
          </TableCell>
          </TableRow>
        ))}
        </TableBody>
        </Table>
        {!loading && searchQuery.trim() && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-white/30 text-sm">No results for <span className="text-white/60 font-bold">&ldquo;{searchQuery}&rdquo;</span></p>
          </div>
        )}
        </>
      );
    })()}

    {activeTab === "manual-parser" && (
      <div className="space-y-6">
      {manualSaved && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
        <CheckCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-bold">Saved to database successfully!</span>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
      <FileText className="w-5 h-5 text-brand shrink-0 mt-0.5" />
      <div>
      <p className="text-sm font-bold text-white/80">Intelligent Parser with Smart Merge</p>
      <p className="text-xs text-white/40 mt-1">Paste a Telegram message below. The system automatically enforces strict ZIP/Batch vs Episode labeling rules, detects duplicates purely by Title, and merges intelligently.</p>
      </div>
      </div>

      <div className="space-y-3">
      <label className="text-xs font-bold uppercase tracking-widest text-white/40">Paste Telegram Message</label>
      <Textarea
      placeholder={"Paste in this format:\n\nMovie Title (2024)\nHindi\nMovie.Title.2024.1080p.BluRay.mkv\nhttps://example.com/file1.mkv\n\n──── or for a series ────\n\nShow Name (2023)\nHindi & English\nShow.Name.S01E01.1080p.WEB-DL.mkv\nhttps://example.com/s01e01.mkv"}
      value={manualText}
      onValueChange={setManualText}
      minRows={10}
      classNames={{ inputWrapper: "bg-white/5 border border-white/10 hover:border-white/20 focus-within:!border-brand/50 font-mono", input: "text-sm text-white/80 placeholder:text-white/15 leading-relaxed" }}
      />
      <Button onPress={handleManualParse} isLoading={manualParsing} isDisabled={!manualText.trim()} className="bg-brand text-white font-bold px-8" startContent={!manualParsing && <Cpu className="w-4 h-4" />}>
      {manualParsing ? "Parsing…" : "Parse Message"}
      </Button>
      </div>

      {manualPreview && (
        <div className="space-y-6">
        {parserConfidence !== "High" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
          <span className="text-sm font-bold">Low Confidence Parsing</span>
          <p className="text-xs opacity-70">Some fields are missing. Please verify the extracted data below before saving.</p>
          </div>
          </div>
        )}

        {/* ── TMDB Candidate Picker ───────────────────────────────────────── */}
        {tmdbPickerOpen && tmdbCandidates.length > 1 && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
          <Search className="w-4 h-4" />
          <h3 className="font-bold text-sm">Multiple TMDB Results — Pick the Correct One</h3>
          </div>
          <Button size="sm" variant="flat" className="text-white/40 text-xs border border-white/10" onPress={() => setTmdbPickerOpen(false)}>Keep Auto-selected</Button>
          </div>
          <p className="text-xs text-white/50">TMDB returned {tmdbCandidates.length} results for this title. The system auto-picked one, but you can override it here.</p>
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
          {tmdbCandidates.map((c) => (
            <button
              key={c.tmdbId}
              disabled={tmdbPickerLoading}
              onClick={() => handleTmdbCandidatePick(c)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer
                ${manualPreview?.tmdbId === c.tmdbId
                  ? "bg-purple-500/20 border-purple-500/60 ring-1 ring-purple-400"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}`}
            >
            {c.poster
              ? <img src={c.poster} className="w-8 h-12 object-cover rounded shrink-0" />
              : <div className="w-8 h-12 bg-white/10 rounded shrink-0 flex items-center justify-center text-white/20 text-xs">?</div>
            }
            <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{c.title} {c.year && <span className="text-white/40 font-normal">({c.year})</span>}</p>
            {c.originalTitle && c.originalTitle !== c.title && <p className="text-xs text-white/40 truncate">{c.originalTitle}</p>}
            {c.overview && <p className="text-xs text-white/30 mt-1 line-clamp-2">{c.overview}</p>}
            </div>
            <div className="shrink-0 text-right">
            {c.rating && <p className="text-xs text-yellow-400 font-bold">★ {c.rating}</p>}
            <p className="text-[10px] text-white/30 font-mono">#{c.tmdbId}</p>
            {manualPreview?.tmdbId === c.tmdbId && <span className="text-[10px] text-purple-400 font-bold">AUTO</span>}
            </div>
            </button>
          ))}
          </div>
          </div>
        )}

        {/* ── DB Duplicate Detection ──────────────────────────────────────── */}
        {existingMatches.length > 0 && selectedMergeId === null && (
          <div className="p-4 rounded-xl bg-brand/10 border border-brand/30 space-y-4">
          <div className="flex items-center gap-2 text-brand">
          <GitMerge className="w-5 h-5" /><h3 className="font-bold">Already in Database — What to Do?</h3>
          </div>
          <p className="text-sm text-white/70">We found {existingMatches.length} existing {existingMatches.length === 1 ? "entry" : "entries"} matching this title and year. Merge new links into one, or add as a separate entry.</p>
          <div className="grid gap-3">
          {existingMatches.map((match) => (
            <div key={match._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 gap-3">
            <div className="flex items-center gap-3 min-w-0">
            {(match as any).poster && <img src={(match as any).poster} className="w-8 h-12 object-cover rounded shrink-0" />}
            <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">{match.title}</p>
            <p className="text-xs text-white/40">{match.year && <span className="mr-2">{match.year}</span>}{match.links?.length || 0} existing links · {match.type}</p>
            {(match as any).tmdbId && <p className="text-[10px] text-green-400/60 font-mono">TMDB #{(match as any).tmdbId}</p>}
            </div>
            </div>
            <Button size="sm" color="primary" className="shrink-0" onPress={() => setSelectedMergeId(match._id)}>Merge Here</Button>
            </div>
          ))}
          <div className="flex justify-end mt-1">
          <Button size="sm" variant="flat" className="text-white/60 bg-white/5 border border-white/10" onPress={() => setSelectedMergeId("NEW")}>Add as New Entry</Button>
          </div>
          </div>
          </div>
        )}

        {selectedMergeId && selectedMergeId !== "NEW" && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
          <GitMerge className="w-4 h-4" />
          <strong>Merge Mode:</strong> Saving will add missing links and update existing ones for <span className="text-white ml-1">{existingMatches.find(m => m._id === selectedMergeId)?.title}</span>.
          <Button size="sm" variant="flat" className="ml-auto text-white/40 text-xs border border-white/10 shrink-0" onPress={() => setSelectedMergeId(null)}>Change</Button>
          </div>
        )}

        <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Parsed Preview</h3>
        <div className="flex gap-2">
        <Button size="sm" variant="flat" onPress={() => setManualEditMode(!manualEditMode)} startContent={manualEditMode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} className="text-white/40 border border-white/10 bg-white/5 text-xs">
        {manualEditMode ? "Collapse Edit" : "Edit Fields"}
        </Button>
        <Button size="sm" className="bg-green-600 text-white font-bold" isLoading={manualSaving} isDisabled={(existingMatches.length > 0 && selectedMergeId === null) || (tmdbPickerOpen && tmdbCandidates.length > 1)} onPress={handleManualSave} startContent={!manualSaving && <Save className="w-4 h-4" />}>
        {manualSaving ? "Saving…" : selectedMergeId === "NEW" ? "Save New Entry" : "Commit Merge"}
        </Button>
        </div>
        </div>

        <div className="flex gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1">
        <Input variant="underlined" placeholder="Wrong TMDB result? Paste TMDB URL to override… e.g. https://www.themoviedb.org/movie/550" value={manualTmdbUrl} onValueChange={setManualTmdbUrl} classNames={{ input: "text-sm text-white/70 placeholder:text-white/20" }} startContent={<Wand2 className="w-4 h-4 text-brand shrink-0" />} onKeyDown={(e) => e.key === "Enter" && handleManualTmdbOverride()} />
        </div>
        <Button size="sm" className="bg-brand text-white font-bold shrink-0 px-4" isLoading={manualTmdbLoading} isDisabled={!manualTmdbUrl.trim()} onPress={handleManualTmdbOverride}>Re-fetch</Button>
        {tmdbCandidates.length > 1 && !tmdbPickerOpen && (
          <Button size="sm" variant="flat" className="shrink-0 text-purple-400 border border-purple-400/30 bg-purple-400/10 text-xs" onPress={() => setTmdbPickerOpen(true)}>
          Pick TMDB ({tmdbCandidates.length})
          </Button>
        )}
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        {manualPreview.poster && <img src={manualPreview.poster} alt="" className="w-12 h-16 object-cover rounded-lg border border-white/10 shrink-0" />}
        <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-lg truncate">{manualPreview.title || "Unknown Title"}</p>
        <div className="flex flex-wrap gap-2 mt-1">
        {manualPreview.year && <span className="text-xs text-white/40">{manualPreview.year}</span>}
        {manualPreview.type && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/60">{manualPreview.type}</span>}
        {manualPreview.tmdbId && <span className="text-[10px] text-green-400 font-bold">✓ TMDB #{manualPreview.tmdbId}</span>}
        </div>
        </div>
        <div className="text-right shrink-0">
        <p className="text-2xl font-bold text-brand">{manualPreview.links?.length || 0}</p>
        <p className="text-xs text-white/30">parsed links</p>
        </div>
        </div>

        {manualEditMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">Metadata</p>
          <Input label="Title" variant="bordered" size="sm" value={manualPreview.title || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, title: v })} />
          <Input label="Original Title" variant="bordered" size="sm" value={manualPreview.originalTitle || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, originalTitle: v })} />
          <div className="grid grid-cols-2 gap-3">
          <Input label="Year" variant="bordered" size="sm" type="number" value={String(manualPreview.year || "")} onValueChange={(v) => setManualPreview({ ...manualPreview, year: Number(v) })} />
          <Select label="Type" variant="bordered" size="sm" selectedKeys={[manualPreview.type || "movie"]} onSelectionChange={(keys) => setManualPreview({ ...manualPreview, type: Array.from(keys)[0] as string })}>
          <SelectItem key="movie">Movie</SelectItem>
          <SelectItem key="series">Series</SelectItem>
          <SelectItem key="anime">Anime</SelectItem>
          </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
          <Input label="Rating" variant="bordered" size="sm" placeholder="e.g. 8.5" value={manualPreview.rating || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, rating: v })} />
          <Input label="Runtime" variant="bordered" size="sm" placeholder="e.g. 148 min" value={manualPreview.runtime || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, runtime: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
          <Input label="Status" variant="bordered" size="sm" placeholder="e.g. Released, Ended" value={manualPreview.status || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, status: v })} />
          <Input label="Country" variant="bordered" size="sm" placeholder="e.g. US, IN, KR" value={manualPreview.country || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, country: v })} />
          </div>
          <Input label="Audio (comma-separated)" variant="bordered" size="sm" placeholder="e.g. Hindi, English, Tamil" value={(manualPreview.audio || []).join(", ")} onValueChange={(v) => setManualPreview({ ...manualPreview, audio: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          <Input label="Genre (comma-separated)" variant="bordered" size="sm" value={(manualPreview.genre || []).join(", ")} onValueChange={(v) => setManualPreview({ ...manualPreview, genre: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          <Input label="Director" variant="bordered" size="sm" value={manualPreview.director || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, director: v })} />
          <Input label="Poster URL" variant="bordered" size="sm" value={manualPreview.poster || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, poster: v })} />
          <Input label="Backdrop URL" variant="bordered" size="sm" value={manualPreview.backdrop || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, backdrop: v })} />
          <Textarea label="Description" variant="bordered" minRows={3} size="sm" value={manualPreview.description || ""} onValueChange={(v) => setManualPreview({ ...manualPreview, description: v })} />
          </div>
          <div className="space-y-3">
          <div className="flex justify-between items-center">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">Download Links</p>
          <Button size="sm" variant="flat" color="primary" startContent={<Plus className="w-3 h-3" />} onPress={addManualLink}>Add Link</Button>
          </div>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {(manualPreview.links || []).map((link: any, idx: number) => (
            <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 relative">
            <Button isIconOnly size="sm" variant="light" className="absolute top-2 right-2 text-white/20 hover:text-red-400" onPress={() => removeManualLink(idx)}><X className="w-3 h-3" /></Button>
            <div className="flex gap-2 items-center mb-1">
            {link.label?.startsWith("Season") ? <Chip size="sm" color="primary" variant="flat">Package Label</Chip> : link.label?.match(/S\d+E\d+/) ? <Chip size="sm" color="secondary" variant="flat">Episode Label</Chip> : null}
            </div>
            <Input label="Label" size="sm" variant="underlined" value={link.label || ""} onValueChange={(v) => updateManualLink(idx, "label", v)} />
            <Input label="URL" size="sm" variant="underlined" value={link.url || ""} onValueChange={(v) => updateManualLink(idx, "url", v)} startContent={<ExternalLink className="w-3 h-3 text-white/20" />} />
            <div className="grid grid-cols-2 gap-2">
            <Input label="Quality" size="sm" variant="underlined" value={link.quality || ""} onValueChange={(v) => updateManualLink(idx, "quality", v)} />
            <Input label="Size" size="sm" variant="underlined" value={link.size || ""} onValueChange={(v) => updateManualLink(idx, "size", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
            <Input label="Season" size="sm" variant="underlined" type="number" value={String(link.season || "")} onValueChange={(v) => updateManualLink(idx, "season", v ? Number(v) : null)} />
            </div>
            </div>
          ))}
          </div>
          </div>
          </div>
        )}

        {!manualEditMode && manualPreview.links?.length > 0 && (
          <div className="space-y-2">
          {manualPreview.links.map((link: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${link.label?.startsWith("Season") ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>{link.label || "Link"}</span>
            <span className="text-xs text-white/50 truncate flex-1">{link.url}</span>
            {link.quality && <span className="text-xs text-white/30 shrink-0">{link.quality}</span>}
            </div>
          ))}
          </div>
        )}
        </div>
      )}
      </div>
    )}

    {/* Existing Edit Modal */}
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" scrollBehavior="inside" classNames={{ base: "bg-[#111] border border-white/10", header: "border-b border-white/5 pb-4", footer: "border-t border-white/5 pt-4" }}>
    <ModalContent>
    {(onClose) => (
      <>
      <ModalHeader className="flex flex-col gap-1 text-white">Edit Content: {selectedMovie?.title}</ModalHeader>
      <ModalBody className="py-6 gap-6">
      {selectedMovie && (
        <>
        <div className="flex gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex-1">
        <Input variant="underlined" placeholder="Paste TMDB URL to auto-fill all fields… e.g. https://www.themoviedb.org/movie/550" value={tmdbUrl} onValueChange={setTmdbUrl} classNames={{ input: "text-sm text-white/70 placeholder:text-white/20" }} startContent={<Wand2 className="w-4 h-4 text-brand shrink-0" />} onKeyDown={(e) => e.key === "Enter" && handleTmdbAutofill()} />
        </div>
        <Button size="sm" className="bg-brand text-white font-bold shrink-0 px-4" isLoading={tmdbLoading} onPress={handleTmdbAutofill}>Auto-fill</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
        <Input label="Title" variant="bordered" value={selectedMovie.title} onValueChange={(v) => setSelectedMovie({...selectedMovie, title: v})} />
        <Input label="Original Title" variant="bordered" placeholder="e.g. 呪術廻戦 or Parasite Korean title" value={selectedMovie.originalTitle || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, originalTitle: v})} />
        <div className="grid grid-cols-2 gap-4">
        <Input label="Year" type="number" variant="bordered" value={String(selectedMovie.year || "")} onValueChange={(v) => setSelectedMovie({...selectedMovie, year: Number(v)})} />
        <Select label="Type" variant="bordered" selectedKeys={[selectedMovie.type]} onSelectionChange={(keys) => setSelectedMovie({...selectedMovie, type: Array.from(keys)[0] as any})}>
        <SelectItem key="movie">Movie</SelectItem>
        <SelectItem key="series">Series</SelectItem>
        <SelectItem key="anime">Anime</SelectItem>
        </Select>
        </div>
        <Input label="Audio (comma-separated)" variant="bordered" placeholder="e.g. Hindi, English, Tamil" value={(selectedMovie.audio || []).join(", ")} onValueChange={(v) => setSelectedMovie({...selectedMovie, audio: v.split(",").map(s => s.trim()).filter(Boolean)})} />
        <Textarea label="Description" variant="bordered" minRows={4} value={selectedMovie.description} onValueChange={(v) => setSelectedMovie({...selectedMovie, description: v})} />
        <Input label="Poster URL" variant="bordered" placeholder="https://..." value={selectedMovie.poster || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, poster: v})} />
        <Input label="Backdrop URL" variant="bordered" placeholder="https://..." value={selectedMovie.backdrop || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, backdrop: v})} />
        <div className="grid grid-cols-2 gap-4">
        <Input label="Rating" variant="bordered" placeholder="e.g. 8.5" value={selectedMovie.rating || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, rating: v})} />
        <Input label="Runtime" variant="bordered" placeholder="e.g. 148 min" value={selectedMovie.runtime || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, runtime: v})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
        <Input label="Country" variant="bordered" placeholder="e.g. USA" value={selectedMovie.country || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, country: v})} />
        <Input label="Director" variant="bordered" placeholder="e.g. Christopher Nolan" value={selectedMovie.director || ""} onValueChange={(v) => setSelectedMovie({...selectedMovie, director: v})} />
        </div>

        <div className="space-y-3">
        <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Cast</h3>
        <Button size="sm" color="primary" variant="flat" startContent={<Plus className="w-4 h-4" />} onPress={() => setSelectedMovie({...selectedMovie, cast: [...(selectedMovie.cast || []), { name: "", character: "", profile_path: null }]})}>Add Cast</Button>
        </div>
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
        {(selectedMovie.cast || []).map((member, idx) => (
          <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 relative">
          <Button isIconOnly size="sm" variant="light" className="absolute top-2 right-2 text-white/20 hover:text-red-400" onPress={() => { const newCast = [...(selectedMovie.cast || [])]; newCast.splice(idx, 1); setSelectedMovie({ ...selectedMovie, cast: newCast }); }}><X className="w-3 h-3" /></Button>
          <Input label="Actor Name" size="sm" variant="underlined" value={member.name} onValueChange={(v) => { const newCast = [...(selectedMovie.cast || [])]; newCast[idx] = { ...newCast[idx], name: v }; setSelectedMovie({ ...selectedMovie, cast: newCast }); }} />
          <Input label="Character" size="sm" variant="underlined" value={member.character} onValueChange={(v) => { const newCast = [...(selectedMovie.cast || [])]; newCast[idx] = { ...newCast[idx], character: v }; setSelectedMovie({ ...selectedMovie, cast: newCast }); }} />
          <Input label="Profile Image URL" size="sm" variant="underlined" placeholder="https://... (optional)" value={member.profile_path || ""} onValueChange={(v) => { const newCast = [...(selectedMovie.cast || [])]; newCast[idx] = { ...newCast[idx], profile_path: v || null }; setSelectedMovie({ ...selectedMovie, cast: newCast }); }} />
          </div>
        ))}
        </div>
        </div>
        </div>

        <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Download Links</h3>
        <Button size="sm" color="primary" variant="flat" startContent={<Plus className="w-4 h-4"/>} onPress={addLink}>Add Link</Button>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {selectedMovie.links.map((link, idx) => (
          <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3 relative">
          <Button isIconOnly size="sm" variant="light" className="absolute top-2 right-2 text-white/20 hover:text-red-400" onPress={() => removeLink(idx)}><X className="w-3 h-3"/></Button>
          <Input label="Label" size="sm" variant="underlined" value={link.label} onValueChange={(v) => updateLink(idx, "label", v)} />
          <Input label="URL" size="sm" variant="underlined" value={link.url} onValueChange={(v) => updateLink(idx, "url", v)} startContent={<ExternalLink className="w-3 h-3 text-white/20" />} />
          <div className="grid grid-cols-2 gap-3">
          <Input label="Quality" size="sm" variant="underlined" value={link.quality || ""} onValueChange={(v) => updateLink(idx, "quality", v)} />
          <Input label="Season" size="sm" type="number" variant="underlined" value={String(link.season || "")} onValueChange={(v) => updateLink(idx, "season", Number(v))} />
          </div>
          </div>
        ))}
        </div>
        </div>
        </div>
        </>
      )}
      </ModalBody>
      <ModalFooter>
      <Button variant="light" onPress={onClose} className="text-white/40">Cancel</Button>
      <Button className="bg-brand text-white font-bold" onPress={handleUpdate}>Save Changes</Button>
      </ModalFooter>
      </>
    )}
    </ModalContent>
    </Modal>
    </div>
    </div>
  );
}
