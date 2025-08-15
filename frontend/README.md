# Math2Visual Frontend

A modern, interactive React application that enables teachers to generate pedagogically meaningful visualizations for math word problems (MWPs). Built with React, TypeScript, Vite, and Tailwind CSS with ShadCN UI components.


## 🛠 Tech Stack

- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Vite 7.0.4
- **Styling**: Tailwind CSS with ShadCN UI components
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Native Fetch API
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast notifications)
- **PDF Generation**: jsPDF for export functionality

## 📁 Project Structure

```
src/
├── api_services/
│   ├── generation.ts        # Generation API
│   └── upload.ts            # Upload SVG API
├── components/
│   ├── errors/              # Error handling components
│   │   └── SVGMissingError.tsx
│   ├── forms/               # Form components
│   │   ├── MathProblemForm.tsx
│   │   └── VisualLanguageForm.tsx
│   ├── ui/                  # ShadCN UI components
│   │   ├── button.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   └── visualization/       # Visualization display components
│       ├── VisualizationCard.tsx
│       └── VisualizationResults.tsx
├── config/
│   └── api.ts              # API configuration
├── hooks/                  # Custom React hooks
│   ├── useMathProblemForm.ts
│   ├── usePageState.ts
│   ├── useSVGMissingError.tsx
│   └── useVisualLanguageForm.ts
├── lib/
│   └── utils.ts            # Utility functions
├── schemas/
│   └── validation.ts       # Zod validation schemas
├── types/
│   └── index.ts            # TypeScript type definitions
└── utils/
    └── download.ts         # Download functionality
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm
- Math2Visual backend running (default: http://localhost:5001)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure backend URL** (optional)
   
   The frontend automatically connects to the backend URL specified in `package.json`:
   ```json
   {
     "proxy": "http://localhost:5001"
   }
   ```
   
   Update this URL if your backend runs on a different address.

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Usage

### Basic Workflow

1. **Enter Math Word Problem**: Type or paste a math word problem into the main text area
2. **Add Formula (Optional)**: Enter the associated mathematical formula in the second input field
3. **Generate Visualization**: Click the "Generate Visualization" button
4. **Wait for Processing**: Watch the animated loading indicator while the backend processes your request
5. **Review Results**: View both formal and intuitive visualizations once generated
6. **Edit Visual Language**: Modify the generated Visual Language (VL) and regenerate if needed
7. **Download**: Export visualizations in your preferred format (SVG, PNG, PDF)

### Error Handling

The application handles various error scenarios:
- **Network errors**: Connection issues with the backend
- **Generation errors**: Problems during visualization creation
- **Missing SVG entities**: Upload interface for required SVG files

### Advanced Features

- **Request Cancellation**: Abort ongoing generation requests
- **Visual Language Editing**: Modify and regenerate from custom VL
- **Multiple Download Formats**: Export in SVG, PNG, or PDF

## 🔧 Configuration

### Environment Variables

The application uses these configuration options:

- **Backend URL**: Set via `package.json` proxy field (default: `http://localhost:5001`)
- **API Endpoints**: Automatically configured based on backend URL

### Customization

- **Styling**: Modify `tailwind.config.js` for theme customization
- **Components**: Extend ShadCN components in `src/components/ui/`
- **API**: Update `src/config/api.ts` for backend configuration changes


## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Verify backend is running on configured port
   - Check `package.json` proxy setting
   - Ensure no firewall blocking the connection

2. **Build Errors**
   - Clear `node_modules` and reinstall dependencies
   - Check TypeScript errors with `npm run lint`
   - Verify all dependencies are up to date

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check CSS variable definitions in `index.css`
   - Verify ShadCN components are correctly installed

## 📝 API Integration

The frontend communicates with the Flask backend via REST API endpoints. For detailed API documentation, request/response schemas, and endpoint specifications, see the [Backend README](../backend/README.md).

### Key Integration Points

- **Generation Endpoint**: `POST /api/generate` - Creates visualizations from math word problems or visual language 
- **File Upload**: SVG entity upload for missing visualization elements
- **Error Handling**: Comprehensive error responses for validation, generation, and system failures 

## 📄 License

This project is part of the Math2Visual system. See the main project repository for license information.

## 🔗 Related

- [Math2Visual GitHub Repository](https://github.com/eth-lre/math2visual)
- [Math2Visual Paper](https://arxiv.org/pdf/2506.03735)
- [Backend Documentation](../backend/README.md)