"use client"

import { useState } from "react"
import {
  Trophy,
  Users,
  Calendar,
  Clock,
  Target,
  Award,
  ChevronRight,
  Flame,
  Zap,
  Heart,
  Share2,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function SocialChallenges() {
  const [activeTab, setActiveTab] = useState("active")
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const { toast } = useToast()

  // Mock active challenges
  const activeChallenges = [
    {
      id: 1,
      title: "30-Day Healthy Eating",
      description: "Eat a balanced meal every day for 30 days",
      participants: 245,
      progress: 60,
      daysLeft: 12,
      joined: true,
      image: "/placeholder.svg?height=100&width=100",
      friends: [
        { name: "Alex", avatar: "/placeholder.svg?height=40&width=40" },
        { name: "Jamie", avatar: "/placeholder.svg?height=40&width=40" },
        { name: "Taylor", avatar: "/placeholder.svg?height=40&width=40" },
      ],
      rewards: [
        { name: "25 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "Healthy Eater Badge", icon: <Heart className="h-4 w-4" /> },
      ],
    },
    {
      id: 2,
      title: "Veggie Week Challenge",
      description: "Try vegetarian meals for a full week",
      participants: 128,
      progress: 40,
      daysLeft: 4,
      joined: true,
      image: "/placeholder.svg?height=100&width=100",
      friends: [{ name: "Jordan", avatar: "/placeholder.svg?height=40&width=40" }],
      rewards: [
        { name: "15 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "Plant Power Badge", icon: <Zap className="h-4 w-4" /> },
      ],
    },
  ]

  // Mock upcoming challenges
  const upcomingChallenges = [
    {
      id: 3,
      title: "Protein Power Month",
      description: "Focus on high-protein meals for muscle growth",
      participants: 89,
      startDate: "May 1, 2025",
      duration: "30 days",
      image: "/placeholder.svg?height=100&width=100",
      friends: [
        { name: "Casey", avatar: "/placeholder.svg?height=40&width=40" },
        { name: "Morgan", avatar: "/placeholder.svg?height=40&width=40" },
      ],
      rewards: [
        { name: "30 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "Protein Pro Badge", icon: <Flame className="h-4 w-4" /> },
        { name: "Free Protein Shake", icon: <Zap className="h-4 w-4" /> },
      ],
    },
    {
      id: 4,
      title: "Global Cuisine Tour",
      description: "Try meals from 5 different cuisines in 2 weeks",
      participants: 156,
      startDate: "May 15, 2025",
      duration: "14 days",
      image: "/placeholder.svg?height=100&width=100",
      friends: [],
      rewards: [
        { name: "20 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "World Traveler Badge", icon: <Trophy className="h-4 w-4" /> },
      ],
    },
  ]

  // Mock completed challenges
  const completedChallenges = [
    {
      id: 5,
      title: "New Year Health Kick",
      description: "Start the year with 14 days of healthy meals",
      participants: 312,
      completedDate: "January 15, 2025",
      achieved: true,
      image: "/placeholder.svg?height=100&width=100",
      rewards: [
        { name: "20 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "Fresh Start Badge", icon: <Zap className="h-4 w-4" /> },
      ],
    },
    {
      id: 6,
      title: "Meal Prep Master",
      description: "Prepare meals in advance for 10 days",
      participants: 178,
      completedDate: "February 28, 2025",
      achieved: false,
      image: "/placeholder.svg?height=100&width=100",
      rewards: [
        { name: "15 Loyalty Points", icon: <Award className="h-4 w-4" /> },
        { name: "Preparation Pro Badge", icon: <Clock className="h-4 w-4" /> },
      ],
    },
  ]

  const handleJoinChallenge = () => {
    if (!selectedChallenge) return

    toast({
      title: "Challenge joined",
      description: `You've joined the ${selectedChallenge.title} challenge`,
    })

    setShowJoinDialog(false)
  }

  const handleShareChallenge = (challenge) => {
    toast({
      title: "Share options",
      description: "Sharing options would appear here",
    })
  }

  const handleInviteFriends = (challenge) => {
    toast({
      title: "Invite friends",
      description: "Friend invitation options would appear here",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Challenges & Goals</CardTitle>
              <CardDescription>Join challenges and track your progress</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {activeChallenges.length > 0 ? (
              <div className="space-y-4">
                {activeChallenges.map((challenge) => (
                  <Card key={challenge.id}>
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-1/3">
                          <img
                            src={challenge.image || "/placeholder.svg"}
                            alt={challenge.title}
                            className="w-full h-full object-cover aspect-video sm:aspect-square"
                          />
                        </div>
                        <div className="p-4 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{challenge.title}</h3>
                              <p className="text-sm text-muted-foreground">{challenge.description}</p>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {challenge.participants}
                            </Badge>
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{challenge.progress}%</span>
                            </div>
                            <Progress value={challenge.progress} className="h-2" />
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{challenge.daysLeft} days left</span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {challenge.friends.map((friend, index) => (
                                <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                  <AvatarImage src={friend.avatar} alt={friend.name} />
                                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                              ))}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                                onClick={() => handleInviteFriends(challenge)}
                              >
                                <UserPlus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleShareChallenge(challenge)}>
                                <Share2 className="h-4 w-4 mr-1" />
                                Share
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No active challenges</h3>
                  <p className="text-sm text-muted-foreground mt-1">Join a challenge to get started</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {upcomingChallenges.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingChallenges.map((challenge) => (
                  <Card key={challenge.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <img
                        src={challenge.image || "/placeholder.svg"}
                        alt={challenge.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{challenge.title}</h3>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {challenge.participants}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>

                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Starts: {challenge.startDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{challenge.duration}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <h4 className="text-xs font-medium mb-1">Rewards:</h4>
                          <div className="flex flex-wrap gap-1">
                            {challenge.rewards.map((reward, index) => (
                              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                                {reward.icon}
                                {reward.name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {challenge.friends.map((friend, index) => (
                              <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={friend.avatar} alt={friend.name} />
                                <AvatarFallback>{friend.name[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                            {challenge.friends.length > 0 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {challenge.friends.length} friend{challenge.friends.length !== 1 ? "s" : ""} joined
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 px-4 py-2">
                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedChallenge(challenge)
                          setShowJoinDialog(true)
                        }}
                      >
                        Join Challenge
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No upcoming challenges</h3>
                  <p className="text-sm text-muted-foreground mt-1">Check back later for new challenges</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            {completedChallenges.length > 0 ? (
              <div className="space-y-3">
                {completedChallenges.map((challenge) => (
                  <div key={challenge.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <img
                      src={challenge.image || "/placeholder.svg"}
                      alt={challenge.title}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm">{challenge.title}</h3>
                        {challenge.achieved ? (
                          <Badge className="bg-green-500">Completed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Incomplete
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{challenge.completedDate}</span>
                        <Users className="h-3 w-3 ml-2" />
                        <span>{challenge.participants} participants</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No completed challenges</h3>
                  <p className="text-sm text-muted-foreground mt-1">Join and complete challenges to see them here</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">Challenges refresh every month</div>
        <Button variant="outline">Create Challenge</Button>
      </CardFooter>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Challenge</DialogTitle>
            <DialogDescription>{selectedChallenge?.description}</DialogDescription>
          </DialogHeader>

          {selectedChallenge && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedChallenge.image || "/placeholder.svg"}
                    alt={selectedChallenge.title}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div>
                    <h3 className="font-medium">{selectedChallenge.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Starts: {selectedChallenge.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Users className="h-4 w-4" />
                      <span>{selectedChallenge.participants} participants</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Challenge Rewards:</h4>
                <div className="space-y-2">
                  {selectedChallenge.rewards.map((reward, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                      <div className="bg-primary/10 p-1.5 rounded-full">{reward.icon}</div>
                      <span className="text-sm">{reward.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Challenge Rules:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Complete the required meals within the challenge period</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Track your progress in the app</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 mt-0.5 text-primary" />
                    <span>Share your experience with the community</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinChallenge}>Join Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

