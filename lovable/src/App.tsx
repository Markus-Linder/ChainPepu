import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import Kit from "@/pages/Kit";
import Pro from "@/pages/Pro";
import Review from "@/pages/Review";
import Privacy from "@/pages/Privacy";
import Imprint from "@/pages/Imprint";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/kit" element={<Kit />} />
          <Route path="/pro" element={<Pro />} />
          <Route path="/review" element={<Review />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/imprint" element={<Imprint />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
