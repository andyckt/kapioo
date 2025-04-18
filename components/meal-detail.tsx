"use client"

import { motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Sparkles, Gem, CreditCard, Coins, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

// Capybara Icon Component
const CapybaraIcon = ({ 
  className, 
  onClick 
}: { 
  className?: string; 
  onClick?: (e: React.MouseEvent) => void;
}) => (
  <svg 
    className={className}
    viewBox="0 0 512 512" 
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    onClick={onClick}
  >
    <path style={{ fill: "#C39B6E" }} d="M256,504c79.313,0,191.59-17.715,215.945-103.974c23.994-84.979-41.25-145.667-55.985-175.956
      c-11.997-24.66-15.996-39.323-15.996-71.981C399.964,40.117,256,39.992,256,39.992s-143.964,0.125-143.964,112.097
      c0,32.658-3.999,47.321-15.996,71.981c-14.735,30.289-79.979,90.978-55.985,175.956C64.41,486.285,176.687,504,256,504z"/>
    <path style={{ fill: "#C0C0C6" }} d="M335.98,424.021c0,21.994-17.996,39.989-39.99,39.989h-79.98c-21.995,0-39.99-17.995-39.99-39.989
      V248.064c0-21.994,16.708-46.673,37.13-54.842l5.72-2.288c20.421-8.169,53.838-8.169,74.26,0l5.72,2.288
      c20.421,8.169,37.13,32.848,37.13,54.842V424.021z"/>
    <path style={{ fill: "#464655" }} d="M334,430.734C334,471.575,280.616,464,256,464s-78,7.575-78-33.266
      c-7.074-35.938,18.692-20.409,36-25.734c21.279-6.548,42-14,42-14s19.018,6.444,41,14C313.079,410.527,338.696,394.607,334,430.734z"
      />
    <g>
      <path style={{ fill: "#9E9EA6" }} d="M256.1,434c4.352,0.009,7.9-3.473,7.9-7.824v-26.401c0-5.666-3.582-10.258-8-10.258
        s-8,4.592-8,10.258v26.401c0,4.351,3.549,7.833,7.9,7.824C255.967,434,256.033,434,256.1,434z"/>
      <path style={{ fill: "#9E9EA6" }} d="M306.416,241.93h-8.975c-6.21,0-12.335,1.446-17.889,4.223l-12.818,6.409
        c-6.757,3.379-14.71,3.379-21.467,0l-12.818-6.409c-5.554-2.777-11.679-4.223-17.889-4.223h-8.975
        c-15.162,0-28.752,11.353-29.545,26.494c-0.846,16.148,11.998,29.506,27.96,29.506h4c24,0,24,32,48,32s24-32,48-32h4
        c15.963,0,28.806-13.358,27.96-29.506C335.167,253.283,321.577,241.93,306.416,241.93z"/>
    </g>
    <g>
      <path style={{ fill: "#878791" }} d="M136.03,8c-8.998,0-7.998,79.98-7.998,79.98L174,59C174,59,145.028,8,136.03,8z"/>
      <path style={{ fill: "#878791" }} d="M375.97,8C366.972,8,337,58,337,58l46.968,29.98C383.968,87.98,384.968,8,375.97,8z"/>
    </g>
    <path d="M301.821,185.795l-5.72-2.288c-10.799-4.32-25.041-6.699-40.101-6.699s-29.302,2.378-40.101,6.699l-5.72,2.288
      c-23.64,9.456-42.159,36.808-42.159,62.27V424.02c0,26.462,21.528,47.991,47.99,47.991h79.979c26.462,0,47.99-21.528,47.99-47.991
      V248.064C343.98,222.603,325.461,195.251,301.821,185.795z M327.98,424.02c0,17.64-14.351,31.991-31.99,31.991h-79.98
      c-17.64,0-31.99-14.351-31.99-31.991v-8.091c34.97-0.777,59.995-6.7,71.98-16.65c11.985,9.95,37.01,15.873,71.98,16.65V424.02z
      M327.98,399.924C279.563,398.777,264,387.379,264,384.03v-23.994c0-4.418-3.582-8-8-8s-8,3.582-8,8v23.994
      c0,3.349-15.563,14.747-63.98,15.894v-151.86c0-18.741,14.7-40.454,32.101-47.414l5.72-2.288c8.824-3.53,21.275-5.554,34.159-5.554
      s25.334,2.024,34.159,5.554l5.72,2.288c17.401,6.96,32.101,28.673,32.101,47.414V399.924z"/>
    <path d="M275.221,264.37c-6.222,9.474-10.921,15.684-19.221,15.684s-12.999-6.21-19.22-15.684
      c-5.02-7.644-10.708-16.308-20.769-16.308c-10.151,0-18.862,6.109-21.675,15.201c-2.698,8.72,0.812,17.685,9.159,23.396
      c3.646,2.496,8.625,1.562,11.12-2.085s1.562-8.625-2.085-11.12c-1.731-1.185-3.642-3.094-2.909-5.462
      c0.585-1.893,2.835-3.93,6.39-3.93c1.426,0,5.608,6.37,7.395,9.09c6.347,9.665,15.039,22.902,32.595,22.902
      s26.248-13.237,32.595-22.902c1.786-2.72,5.969-9.09,7.395-9.09c3.555,0,5.804,2.037,6.39,3.93c0.732,2.368-1.178,4.277-2.909,5.462
      c-3.646,2.495-4.58,7.474-2.085,11.12s7.473,4.579,11.12,2.085c8.347-5.711,11.857-14.676,9.159-23.396
      c-2.813-9.092-11.523-15.201-21.675-15.201C285.929,248.063,280.24,256.726,275.221,264.37z"/>
    <path d="M220.579,417.453c-3.625-2.522-8.612-1.629-11.136,1.999c-2.523,3.627-1.628,8.612,1.999,11.136
      c13.557,9.431,28.615,9.431,44.558,9.431s31.001,0,44.558-9.431c3.627-2.523,4.522-7.509,1.999-11.136
      c-2.524-3.627-7.51-4.521-11.136-1.999c-9.438,6.565-20.904,6.565-35.421,6.565C241.483,424.018,230.016,424.018,220.579,417.453z"
      />
    <path d="M144.028,144.089c-9.27,0-15.998,10.092-15.998,23.996s6.728,23.996,15.998,23.996s15.998-10.092,15.998-23.996
      S153.298,144.089,144.028,144.089z"/>
    <path d="M367.972,144.089c-9.27,0-15.998,10.092-15.998,23.996s6.728,23.996,15.998,23.996s15.998-10.092,15.998-23.996
      C383.97,154.181,377.242,144.089,367.972,144.089z"/>
    <path d="M474.95,308.894c-9.939-26.4-25.035-48.081-37.165-65.501c-6.285-9.026-11.713-16.822-14.632-22.821
      c-11.397-23.427-15.189-36.609-15.189-68.482c0-22.212-5.415-41.806-15.947-58.441c0.031-5.981,0.045-22.128-0.542-38.723
      c-1.466-41.415-5.194-48.529-8.574-51.946C381.001,1.058,378.54,0,375.97,0c-6.252,0-13.082,4.749-29.487,29.02
      c-4.764,7.048-9.146,14.023-12.179,18.964c-1.131-0.468-2.261-0.937-3.417-1.388c-36.964-14.406-73.35-14.604-74.894-14.605
      c-1.531,0.001-37.917,0.199-74.88,14.605c-1.249,0.487-2.471,0.992-3.691,1.499c-2.944-4.878-7.449-12.172-12.385-19.546
      C149.053,4.671,142.297,0,136.03,0c-2.575,0-5.041,1.06-6.944,2.985c-3.375,3.413-7.098,10.483-8.562,51.435
      c-0.622,17.381-0.568,34.269-0.535,39.219c-10.536,16.638-15.953,36.234-15.953,58.45c0,31.873-3.792,45.055-15.189,68.482
      c-2.918,5.999-8.347,13.795-14.632,22.821c-12.129,17.42-27.226,39.101-37.165,65.501c-11.936,31.703-13.471,62.224-4.695,93.307
      c11.604,41.094,42.651,71.26,92.282,89.661C169.532,508.506,220.853,512,256,512s86.468-3.494,131.363-20.139
      c49.63-18.401,80.678-48.567,92.282-89.661C488.421,371.117,486.885,340.596,474.95,308.894z M372.79,20.359
      c1.781,10.895,2.87,32.031,3.173,53.844c-7.699-7.31-16.74-13.786-27.115-19.361C357.28,41.167,366.674,27.454,372.79,20.359z
      M139.188,20.354c6.107,7.144,15.465,20.991,23.719,34.625c-10.276,5.547-19.241,11.979-26.881,19.234
      C136.313,52.457,137.398,31.263,139.188,20.354z M464.247,397.853c-10.137,35.9-37.875,62.482-82.446,79.006
      C339.13,492.679,289.837,496,256,496s-83.13-3.321-125.801-19.141c-44.57-16.524-72.309-43.106-82.446-79.006
      c-17.77-62.935,16.75-112.512,39.592-145.317c6.667-9.575,12.425-17.845,15.889-24.965c11.849-24.356,16.802-40.227,16.802-75.481
      c0-42.683,22.378-73.11,66.512-90.438c34.193-13.424,69.116-13.659,69.445-13.66c0.345,0,34.886,0.184,69.083,13.513
      c1.88,0.733,3.707,1.499,5.508,2.279c0.619,0.831,1.411,1.556,2.361,2.113c1.432,0.842,3.019,1.187,4.561,1.088
      c17.181,8.521,30.331,19.447,39.399,32.714c0.256,0.489,0.562,0.949,0.91,1.374c9.402,14.362,14.147,31.389,14.147,51.017
      c0,35.254,4.953,51.125,16.802,75.481c3.464,7.12,9.222,15.39,15.889,24.965C447.497,285.341,482.017,334.918,464.247,397.853z"/>
  </svg>
);

interface MealDetailProps {
  meal: {
    name: string;
    image?: string;
    description?: string;
    ingredients?: string[];
    allergens?: string[];
  };
  day: string;
  dayDate?: string;
  isToday?: boolean;
  onSelect: (day: string) => void;
  isSelected: boolean;
  isUnavailable?: boolean;
  unavailableReason?: string;
}

export function MealDetail({ 
  meal, 
  day, 
  dayDate, 
  isToday = false, 
  onSelect, 
  isSelected,
  isUnavailable = false,
  unavailableReason = ""
}: MealDetailProps) {
  return (
    <Dialog>
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`rounded-lg border p-4 cursor-pointer relative flex flex-col sm:flex-row
          ${isSelected ? "border-primary bg-primary/5" : ""} 
          ${isToday ? "ring-1 ring-primary/50" : ""}
        `}
        onClick={() => onSelect(day)}
      >
        {/* Left side - Image and day/date */}
        <div className="sm:w-2/5 flex flex-col space-y-2">
          <div className="aspect-square relative overflow-hidden rounded-md">
            <img
              src={meal.image || "/placeholder.svg"}
              alt={meal.name}
              className="object-cover w-full h-full transition-transform hover:scale-105"
            />
            
            {isUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-background/80 text-black text-xs rounded px-2 py-1 text-center max-w-[90%]">
                  {unavailableReason === "This day has already passed" ? "This day has passed already" : unavailableReason}
                </div>
              </div>
            )}
            
            <div className="absolute top-2 left-2 bg-background rounded-full p-1 shadow">
              <div className={`h-4 w-4 rounded-full ${isSelected ? "bg-primary" : "bg-muted"}`} />
            </div>
            
            <DialogTrigger asChild>
              <CapybaraIcon 
                className="absolute bottom-1 right-1 z-10 h-5 w-5 cursor-pointer transition-all duration-200 hover:scale-125 hover:drop-shadow-md opacity-75 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              />
            </DialogTrigger>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <h3 className="text-lg font-medium capitalize">{day}</h3>
              {dayDate && <span className="text-sm">({dayDate})</span>}
            </div>
            
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <span className="font-medium">1</span>
              <Gem className="h-3.5 w-3.5 ml-1 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Right side - Description */}
        <div className="sm:w-3/5 sm:pl-4 mt-3 sm:mt-0 flex flex-col justify-center">
          <div className="space-y-2 max-w-md">
            {meal.description ? (
              <div>
                {meal.description.split('. ')
                  .filter(Boolean)
                  .map((sentence, index) => (
                    <div key={index} className="flex items-start gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-base md:text-xl">{sentence.replace(/\.$/, '').trim()}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-base md:text-xl">Fresh ingredients prepared daily</p>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-base md:text-xl">Delivered in eco-friendly packaging</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-base md:text-xl">Perfect for a healthy and satisfying meal without the hassle of cooking</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Day Details</DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="flex items-center gap-1 text-foreground font-normal">
            <span className="text-base font-medium capitalize">{day}</span>
            {dayDate && <span className="text-base">({dayDate})</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-md mx-auto" style={{ maxWidth: "250px" }}>
              <img
                src={meal.image || "/placeholder.svg"}
                alt={meal.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          {isUnavailable && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 my-2">
              {unavailableReason}
            </div>
          )}

          <div className="space-y-3">
            {meal.description ? (
              <div className="space-y-3">
                {meal.description.split('. ')
                  .filter(Boolean)
                  .map((sentence, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                      <p className="text-base">{sentence.replace(/\.$/, '').trim()}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-base">Our delicious meal is prepared with fresh ingredients</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-base">Delivered to your door in eco-friendly packaging</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-base">Perfect for a healthy and satisfying meal without the hassle of cooking</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

