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
import { Edit, Trash2, Lock, LayoutDashboard, ExternalLink, Plus, X } from "lucide-react";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
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

  const fetchMovies = async (pass?: string) => {
    const currentPass = pass || password;
    setLoading(true);
    try {
      // Use any protected route to verify pass while fetching if needed, 
      // but getMovies is public. We just fetch items here.
      const data = await movieApi.getMovies({ limit: 100 });
      setMovies(data.movies);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
    onOpen();
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
            {movies.map((movie) => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Input 
                          label="Title" 
                          variant="bordered"
                          value={selectedMovie.title} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, title: v})} 
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
                        <Textarea 
                          label="Description" 
                          variant="bordered"
                          minRows={4}
                          value={selectedMovie.description} 
                          onValueChange={(v) => setSelectedMovie({...selectedMovie, description: v})} 
                        />
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
