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
} from "@heroui/react";
import { Edit, Trash2, Lock, LayoutDashboard, ExternalLink, Plus, X, Wand2, Search, RefreshCw } from "lucide-react";

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
  
  // Auth Check
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

  // Debounced search — re-fetches from backend on every keystroke (after 400ms)
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
          ...(data.language   && { language:   data.language }),
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
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onValueChange={setPassword}
                className="bg-white/5"
              />
              <Button 
                onPress={handleLogin}
                className="w-full bg-brand text-white font-bold h-12 rounded-xl"
              >
                Authenticate
              </Button>
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
            <Button
              variant="flat"
              isLoading={bulkRunning}
              onPress={handleBulkUpdate}
              startContent={!bulkRunning && <RefreshCw className="w-4 h-4" />}
              className="text-white/40 hover:text-brand border border-white/10 bg-white/5 text-xs"
            >
              {bulkRunning ? "Updating…" : "Bulk Fix Descriptions"}
            </Button>
            <Button 
              variant="flat" 
              onPress={() => {
                localStorage.removeItem("admin_pass");
                setIsLoggedIn(false);
              }}
              className="text-white/40 hover:text-red-400"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Bulk update progress */}
        {(bulkLog.length > 0 || bulkSummary) && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            {bulkSummary ? (
              <p className="text-sm font-bold text-white/70">
                ✅ Done — <span className="text-green-400">{bulkSummary.updated} updated</span>
                {bulkSummary.failed > 0 && <span className="text-red-400"> · {bulkSummary.failed} failed</span>}
                <span className="text-white/30"> · {bulkSummary.total} total processed</span>
              </p>
            ) : (
              <p className="text-xs text-white/30 uppercase tracking-widest">Updating descriptions…</p>
            )}
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {bulkLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={entry.status === "updated" ? "text-green-400" : "text-red-400"}>
                    {entry.status === "updated" ? "✓" : "✗"}
                  </span>
                  <span className="text-white/50 truncate">{entry.title}</span>
                  <span className="text-white/20 ml-auto shrink-0">{entry.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="w-4 h-4 text-white/30 shrink-0" />}
            isClearable
            onClear={() => setSearchQuery("")}
            classNames={{
              inputWrapper: "bg-white/5 border border-white/10 hover:border-white/20 focus-within:!border-brand/50 h-11",
              input: "text-sm text-white placeholder:text-white/20",
            }}
          />
        </div>

        {(() => {
          const filtered = movies;
          return (
            <>
              <Table
                aria-label="Movie management table"
                classNames={{
                  base: "bg-white/5 border border-white/10 rounded-2xl overflow-hidden",
                  header: "bg-white/10",
                  th: "bg-transparent text-white/40 text-[11px] uppercase tracking-widest h-14 border-b border-white/10",
                  td: "text-white/80 py-4",
                }}
              >
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
                      <TableCell>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/10">
                          {movie.type}
                        </span>
                      </TableCell>
                      <TableCell>{movie.links?.length || 0} Links</TableCell>
                      <TableCell className="text-white/30 text-xs">
                        {new Date(movie.addedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button isIconOnly variant="flat" size="sm" onPress={() => handleEdit(movie)} className="bg-white/5 hover:bg-blue-500/20 text-blue-400">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button isIconOnly variant="flat" size="sm" onPress={() => handleDelete(movie._id)} className="bg-white/5 hover:bg-red-500/20 text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

        {/* Edit Modal */}
        <Modal 
          isOpen={isOpen} 
          onOpenChange={onOpenChange} 
          size="4xl" 
          scrollBehavior="inside"
          classNames={{
            base: "bg-[#111] border border-white/10",
            header: "border-b border-white/5 pb-4",
            footer: "border-t border-white/5 pt-4",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 text-white">
                  Edit Content: {selectedMovie?.title}
                </ModalHeader>
                <ModalBody className="py-6 gap-6">
                  {selectedMovie && (
                    <>
                      {/* TMDB Autofill */}
                      <div className="flex gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex-1">
                          <Input
                            variant="underlined"
                            placeholder="Paste TMDB URL to auto-fill all fields… e.g. https://www.themoviedb.org/movie/550"
                            value={tmdbUrl}
                            onValueChange={setTmdbUrl}
                            classNames={{ input: "text-sm text-white/70 placeholder:text-white/20" }}
                            startContent={<Wand2 className="w-4 h-4 text-brand shrink-0" />}
                            onKeyDown={(e) => e.key === "Enter" && handleTmdbAutofill()}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="bg-brand text-white font-bold shrink-0 px-4"
                          isLoading={tmdbLoading}
                          onPress={handleTmdbAutofill}
                        >
                          Auto-fill
                        </Button>
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Input 
                          label="Title" 
                          variant="bordered"
                          value={selectedMovie.title} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, title: v})} 
                        />
                        <Input 
                          label="Original Title" 
                          variant="bordered"
                          placeholder="e.g. 呪術廻戦 or Parasite Korean title"
                          value={selectedMovie.originalTitle || ""} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, originalTitle: v})} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Year" 
                            type="number"
                            variant="bordered"
                            value={String(selectedMovie.year || "")} 
                            onValueChange={(v) => setSelectedMovie({...selectedMovie, year: Number(v)})} 
                          />
                          <Select 
                            label="Type" 
                            variant="bordered"
                            selectedKeys={[selectedMovie.type]}
                            onSelectionChange={(keys) => setSelectedMovie({...selectedMovie, type: Array.from(keys)[0] as any})}
                          >
                            <SelectItem key="movie">Movie</SelectItem>
                            <SelectItem key="series">Series</SelectItem>
                            <SelectItem key="anime">Anime</SelectItem>
                          </Select>
                        </div>
                        <Input 
                          label="Language" 
                          variant="bordered"
                          value={selectedMovie.language} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, language: v})} 
                        />
                        <Input 
                          label="Audio (comma-separated)" 
                          variant="bordered"
                          placeholder="e.g. Hindi, English, Tamil"
                          value={(selectedMovie.audio || []).join(", ")} 
                          onValueChange={(v) => setSelectedMovie({
                            ...selectedMovie, 
                            audio: v.split(",").map(s => s.trim()).filter(Boolean)
                          })} 
                        />
                        <Textarea 
                          label="Description" 
                          variant="bordered"
                          minRows={4}
                          value={selectedMovie.description} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, description: v})} 
                        />
                        <Input 
                          label="Poster URL" 
                          variant="bordered"
                          placeholder="https://..."
                          value={selectedMovie.poster || ""} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, poster: v})} 
                        />
                        <Input 
                          label="Backdrop URL" 
                          variant="bordered"
                          placeholder="https://..."
                          value={selectedMovie.backdrop || ""} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, backdrop: v})} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Rating" 
                            variant="bordered"
                            placeholder="e.g. 8.5"
                            value={selectedMovie.rating || ""} 
                            onValueChange={(v) => setSelectedMovie({...selectedMovie, rating: v})} 
                          />
                          <Input 
                            label="Runtime" 
                            variant="bordered"
                            placeholder="e.g. 148 min"
                            value={selectedMovie.runtime || ""} 
                            onValueChange={(v) => setSelectedMovie({...selectedMovie, runtime: v})} 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Country" 
                            variant="bordered"
                            placeholder="e.g. USA"
                            value={selectedMovie.country || ""} 
                            onValueChange={(v) => setSelectedMovie({...selectedMovie, country: v})} 
                          />
                          <Input 
                            label="Director" 
                            variant="bordered"
                            placeholder="e.g. Christopher Nolan"
                            value={selectedMovie.director || ""} 
                            onValueChange={(v) => setSelectedMovie({...selectedMovie, director: v})} 
                          />
                        </div>

                        {/* Cast Section */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="text-white font-bold text-sm uppercase tracking-widest">Cast</h3>
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              startContent={<Plus className="w-4 h-4" />}
                              onPress={() => setSelectedMovie({
                                ...selectedMovie,
                                cast: [...(selectedMovie.cast || []), { name: "", character: "", profile_path: null }]
                              })}
                            >
                              Add Cast
                            </Button>
                          </div>
                          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                            {(selectedMovie.cast || []).map((member, idx) => (
                              <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 relative">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="absolute top-2 right-2 text-white/20 hover:text-red-400"
                                  onPress={() => {
                                    const newCast = [...(selectedMovie.cast || [])];
                                    newCast.splice(idx, 1);
                                    setSelectedMovie({ ...selectedMovie, cast: newCast });
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                                <Input
                                  label="Actor Name"
                                  size="sm"
                                  variant="underlined"
                                  value={member.name}
                                  onValueChange={(v) => {
                                    const newCast = [...(selectedMovie.cast || [])];
                                    newCast[idx] = { ...newCast[idx], name: v };
                                    setSelectedMovie({ ...selectedMovie, cast: newCast });
                                  }}
                                />
                                <Input
                                  label="Character"
                                  size="sm"
                                  variant="underlined"
                                  value={member.character}
                                  onValueChange={(v) => {
                                    const newCast = [...(selectedMovie.cast || [])];
                                    newCast[idx] = { ...newCast[idx], character: v };
                                    setSelectedMovie({ ...selectedMovie, cast: newCast });
                                  }}
                                />
                                <Input
                                  label="Profile Image URL"
                                  size="sm"
                                  variant="underlined"
                                  placeholder="https://... (optional)"
                                  value={member.profile_path || ""}
                                  onValueChange={(v) => {
                                    const newCast = [...(selectedMovie.cast || [])];
                                    newCast[idx] = { ...newCast[idx], profile_path: v || null };
                                    setSelectedMovie({ ...selectedMovie, cast: newCast });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-white font-bold text-sm uppercase tracking-widest">Download Links</h3>
                          <Button size="sm" color="primary" variant="flat" startContent={<Plus className="w-4 h-4"/>} onPress={addLink}>
                            Add Link
                          </Button>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {selectedMovie.links.map((link, idx) => (
                            <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3 relative">
                              <Button isIconOnly size="sm" variant="light" className="absolute top-2 right-2 text-white/20 hover:text-red-400" onPress={() => removeLink(idx)}>
                                <X className="w-3 h-3"/>
                              </Button>
                              <Input 
                                label="Label" 
                                size="sm"
                                variant="underlined"
                                value={link.label} 
                                onValueChange={(v) => updateLink(idx, "label", v)} 
                              />
                              <Input 
                                label="URL" 
                                size="sm"
                                variant="underlined"
                                value={link.url} 
                                onValueChange={(v) => updateLink(idx, "url", v)} 
                                startContent={<ExternalLink className="w-3 h-3 text-white/20" />}
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input 
                                  label="Quality" 
                                  size="sm"
                                  variant="underlined"
                                  value={link.quality || ""} 
                                  onValueChange={(v) => updateLink(idx, "quality", v)} 
                                />
                                <Input 
                                  label="Season" 
                                  size="sm"
                                  type="number"
                                  variant="underlined"
                                  value={String(link.season || "")} 
                                  onValueChange={(v) => updateLink(idx, "season", Number(v))} 
                                />
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
                  <Button variant="light" onPress={onClose} className="text-white/40">
                    Cancel
                  </Button>
                  <Button className="bg-brand text-white font-bold" onPress={handleUpdate}>
                    Save Changes
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
