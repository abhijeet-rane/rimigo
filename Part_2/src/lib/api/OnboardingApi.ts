// types/destination.ts
export interface Destination {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}
export interface SearchDestinationCardData {
  id: string;
  title: string;
  imageUrl: string;
  bannerImageUrl?: string;
  isLive?: boolean;
  region?: string;
}
export const getPairedDestinationData = async ():Promise<SearchDestinationCardData[]> =>{
    return[
          {
      id: "1",
      title: "Italy",
      imageUrl:
        "https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0",
    },
    {
      id: "2",
      title: "Japan",
      imageUrl:
        "https://imgs.search.brave.com/vfDQL5ndq2Yenf9legH7O25m5H3rdXhPOnKqfIcStVM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTQ2/MTM1ODE1Ni9waG90/by9oYXBweS13b21h/bi1lbmpveWluZy1z/dW5saWdodC1vbi1m/YWNlLWR1cmluZy12/YWNhdGlvbi5qcGc_/cz02MTJ4NjEyJnc9/MCZrPTIwJmM9UFc4/aXpKVnFVSUlvODB0/Tlp4aE5KUGx5Nmt4/ellORlpuTGZHZHo5/a3N2cz0",
    },
    {
      id: "3",
      title: "Bali",
      imageUrl:
        "https://imgs.search.brave.com/JrjyB7Ih0nBFRepB6__nZPGtDA9Xe3qEkZBox_f7Y3w/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/c2h1dHRlcnN0b2Nr/LmNvbS9pbWFnZS1w/aG90by9ncmVlbi1m/aWVsZC1zdW5zZXQt/ZGVzdGluYXRpb24t/YmlnLTI2MG53LTIy/MzQ0NzkyNzUuanBn",
    },
    ]
}
export const getSearchSuggestionData = async ():Promise<SearchDestinationCardData[]> =>{
    return[
          {
      id: "1",
      title: "Italy",
      imageUrl:
        "https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0",
    },
    {
      id: "2",
      title: "Japan",
      imageUrl:
        "https://imgs.search.brave.com/vfDQL5ndq2Yenf9legH7O25m5H3rdXhPOnKqfIcStVM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTQ2/MTM1ODE1Ni9waG90/by9oYXBweS13b21h/bi1lbmpveWluZy1z/dW5saWdodC1vbi1m/YWNlLWR1cmluZy12/YWNhdGlvbi5qcGc_/cz02MTJ4NjEyJnc9/MCZrPTIwJmM9UFc4/aXpKVnFVSUlvODB0/Tlp4aE5KUGx5Nmt4/ellORlpuTGZHZHo5/a3N2cz0",
    },
    {
      id: "3",
      title: "Bali",
      imageUrl:
        "https://imgs.search.brave.com/JrjyB7Ih0nBFRepB6__nZPGtDA9Xe3qEkZBox_f7Y3w/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/c2h1dHRlcnN0b2Nr/LmNvbS9pbWFnZS1w/aG90by9ncmVlbi1m/aWVsZC1zdW5zZXQt/ZGVzdGluYXRpb24t/YmlnLTI2MG53LTIy/MzQ0NzkyNzUuanBn",
    },
    ]
}
export const getSearchDestinationData = async (
  searchTerm: string = ""
): Promise<SearchDestinationCardData[]> => {
  const allDestinations: SearchDestinationCardData[] = [
    {
      id: "1",
      title: "Italy",
      imageUrl:
        "https://imgs.search.brave.com/MTrFkA8CB_0Z0mc5w4w3xfdKhlQ-k2SAkR1xhhSTg0Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTEz/NzIyNjUyL2ZyL3Bo/b3RvL2xhLXBsYWNl/LXNhaW50LW1hcmMt/ZXQtdmVuaXNlLWl0/YWxpZS5qcGc_cz02/MTJ4NjEyJnc9MCZr/PTIwJmM9V19vOU43/SE9GYkhOdm4xYWZh/TXNtVmp5VWw1ckRX/OE5IVlNJZ1dXNFZH/bz0",
    },
    {
      id: "2",
      title: "Japan",
      imageUrl:
        "https://imgs.search.brave.com/vfDQL5ndq2Yenf9legH7O25m5H3rdXhPOnKqfIcStVM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTQ2/MTM1ODE1Ni9waG90/by9oYXBweS13b21h/bi1lbmpveWluZy1z/dW5saWdodC1vbi1m/YWNlLWR1cmluZy12/YWNhdGlvbi5qcGc_/cz02MTJ4NjEyJnc9/MCZrPTIwJmM9UFc4/aXpKVnFVSUlvODB0/Tlp4aE5KUGx5Nmt4/ellORlpuTGZHZHo5/a3N2cz0",
    },
    {
      id: "3",
      title: "Bali",
      imageUrl:
        "https://imgs.search.brave.com/JrjyB7Ih0nBFRepB6__nZPGtDA9Xe3qEkZBox_f7Y3w/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/c2h1dHRlcnN0b2Nr/LmNvbS9pbWFnZS1w/aG90by9ncmVlbi1m/aWVsZC1zdW5zZXQt/ZGVzdGluYXRpb24t/YmlnLTI2MG53LTIy/MzQ0NzkyNzUuanBn",
    },
  ];

  // If searchTerm is empty, return empty array
  if (!searchTerm.trim()) return [];

  // Filter destinations by title
  return allDestinations.filter((dest) =>
    dest.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
};


// later you can change this to hit your backend API
export const getPopularDestinations = async (): Promise<Destination[]> => {
  // mock data for now
  return [
    {
      id: "1",
      title: "Japan",
      subtitle: "Culture-rich and perfect for an extravagant romantic getaway",
      imageUrl:
        "https://imgs.search.brave.com/vfDQL5ndq2Yenf9legH7O25m5H3rdXhPOnKqfIcStVM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTQ2/MTM1ODE1Ni9waG90/by9oYXBweS13b21h/bi1lbmpveWluZy1z/dW5saWdodC1vbi1m/YWNlLWR1cmluZy12/YWNhdGlvbi5qcGc_/cz02MTJ4NjEyJnc9/MCZrPTIwJmM9UFc4/aXpKVnFVSUlvODB0/Tlp4aE5KUGx5Nmt4/ellORlpuTGZHZHo5/a3N2cz0",
    },
    {
      id: "2",
      title: "Paris",
      subtitle: "The city of love with breathtaking architecture and cuisine",
      imageUrl:
        "https://imgs.search.brave.com/pBGcYjPXE3xs0FKiaXYplUrncj6jvsHWasgiBFcr058/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTQz/ODQ5NTMzNC9waG90/by95b3VuZy1tYW4t/YXQtdGhlLWFpcnBv/cnQtbG9va2luZy1h/dC10aGUtbGlzdC1v/Zi1kZXN0aW5hdGlv/bnMtaG9sZGluZy1h/LWNlbGwtcGhvbmUu/anBnP3M9NjEyeDYx/MiZ3PTAmaz0yMCZj/PThXM1RqbFpMdmRE/QWtEZkdvWl94SS1y/Y2RFX3VfQmgtald4/aDhUSlRfSm89",
    },
    {
      id: "3",
      title: "Bali",
      subtitle: "A tropical paradise with serene beaches and lush landscapes",
      imageUrl:
        "https://imgs.search.brave.com/JrjyB7Ih0nBFRepB6__nZPGtDA9Xe3qEkZBox_f7Y3w/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93d3cu/c2h1dHRlcnN0b2Nr/LmNvbS9pbWFnZS1w/aG90by9ncmVlbi1m/aWVsZC1zdW5zZXQt/ZGVzdGluYXRpb24t/YmlnLTI2MG53LTIy/MzQ0NzkyNzUuanBn",
    },
  ];
};
